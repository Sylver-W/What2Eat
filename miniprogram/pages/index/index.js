// pages/index/index.js
const db = wx.cloud.database()
const _ = db.command

const BOARD_TABS = [
  { key: 'hot', label: '热门榜' },
  { key: 'avoid', label: '避雷榜' },
  { key: 'latest', label: '新品榜' }
]

Page({
  data: {
    active: 'home',
    loading: true,
    loadFailed: false,

    todayDishes: [],

    boardTabs: BOARD_TABS,
    activeBoard: 'hot',
    boardDishes: []
  },

  onLoad() {
    this.loadHomeData()
  },

  onShow() {
    this.setData({ active: 'home' })
  },

  /**
   * 首页数据：今日推荐 + 三个榜单
   * 直接读取云数据库（与食堂页、详情页保持一致的数据来源），
   * 图片统一交给 getDishImages 云函数换取临时链接。
   */
  async loadHomeData() {
    this.setData({ loading: true, loadFailed: false })

    try {
      const dishes = db.collection('dishes')
      const onSale = { isAvailable: _.neq(false) }
      const rated = { isAvailable: _.neq(false), ratingCount: _.gt(0) }

      const [topRes, hotRes, avoidRes, latestRes] = await Promise.all([
        // 今日推荐候选：高评分菜品
        dishes.where({ ...onSale, rating: _.gte(4) })
          .orderBy('rating', 'desc').limit(20).get(),
        // 热门榜：评价人数最多
        dishes.where(rated)
          .orderBy('ratingCount', 'desc').limit(5).get(),
        // 避雷榜：评分最低（仅有评价的菜品参与）
        dishes.where(rated)
          .orderBy('rating', 'asc').limit(5).get(),
        // 新品榜：最近入库
        dishes.where(onSale)
          .orderBy('createTime', 'desc').limit(5).get()
      ])

      const hotList = hotRes.data || []
      const avoidList = avoidRes.data || []
      const latestList = latestRes.data || []

      // 今日推荐：高评分池数据不足时降级用热门榜兜底
      const todayPool = (topRes.data && topRes.data.length) ? topRes.data : hotList
      const todayRaw = this.pickDaily(todayPool, 6)

      // 一次性处理所有出现过的菜品图片，避免重复请求云函数
      const merged = this.mergeUnique([...todayRaw, ...hotList, ...avoidList, ...latestList])
      const withImages = await this.attachImages(merged)

      const source = { hotList, avoidList, latestList }
      // 榜单数据缓存在实例上，避免 setData 把三份列表都推给视图层
      this._boards = {
        hot: this.buildBoard('hot', source, withImages),
        avoid: this.buildBoard('avoid', source, withImages),
        latest: this.buildBoard('latest', source, withImages)
      }

      this.setData({
        todayDishes: this.normalize(todayRaw, withImages, 'rating'),
        boardTabs: BOARD_TABS,
        activeBoard: 'hot',
        boardDishes: this._boards.hot,
        loading: false
      })
    } catch (err) {
      console.error('首页数据加载失败:', err)
      this.setData({ loading: false, loadFailed: true })
    }
  },

  /**
   * 按天轮换取菜，保证同一天内多次进入首页结果稳定
   */
  pickDaily(pool, size) {
    if (!pool || pool.length <= size) return pool ? pool.slice() : []
    const daySeed = Math.floor(Date.now() / 86400000)
    const start = daySeed % pool.length
    return pool.slice(start).concat(pool.slice(0, start)).slice(0, size)
  },

  mergeUnique(list) {
    const map = {}
    list.forEach(dish => {
      if (dish && dish._id) map[dish._id] = dish
    })
    return Object.keys(map).map(id => map[id])
  },

  /**
   * 调用 getDishImages 云函数批量换取图片临时链接，失败时退化为原始首图
   */
  async attachImages(dishes) {
    if (!dishes.length) return []
    try {
      const res = await wx.cloud.callFunction({
        name: 'getDishImages',
        data: { dishes }
      })
      if (res.result && res.result.success && Array.isArray(res.result.data)) {
        return res.result.data
      }
      console.warn('getDishImages 返回异常，使用原始图片:', res.result)
    } catch (err) {
      console.warn('getDishImages 调用失败，使用原始图片:', err)
    }
    return dishes
  },

  /**
   * 组装某个榜单的展示数据
   */
  buildBoard(key, source, withImages) {
    let raw = []
    if (key === 'hot') raw = source.hotList
    else if (key === 'avoid') raw = source.avoidList
    else raw = source.latestList
    return this.normalize(raw, withImages, key)
  },

  /**
   * 补齐展示字段；图片按 _id 从云函数结果里回填
   */
  normalize(list, withImages, boardKey) {
    const imageMap = {}
    ;(withImages || []).forEach(dish => {
      imageMap[dish._id] = dish.imageUrl ||
        (dish.images && dish.images[0]) || '/images/dish1.jpg'
    })

    return (list || []).map(dish => {
      const source = imageMap[dish._id]
      const fallback = (dish.images && dish.images[0]) || '/images/dish1.jpg'

      let price = dish.price === undefined || dish.price === null ? 0 : dish.price
      if (typeof price === 'string') price = parseFloat(price) || 0

      const rating = Number(dish.rating) || 0
      const ratingCount = Number(dish.ratingCount) || 0
      const favourCount = Number(dish.favourCount) || 0

      let metricText = ''
      if (boardKey === 'hot') metricText = `${ratingCount}人评`
      else if (boardKey === 'avoid') metricText = `${rating.toFixed(1)}分`
      else if (boardKey === 'latest') metricText = this.formatDate(dish.createTime)
      else metricText = `${rating.toFixed(1)}分`

      return {
        _id: dish._id,
        dishId: dish.dishId || dish._id,
        name: dish.name || '未知菜品',
        canteenName: dish.canteenName || '',
        price: price.toFixed(2),
        rating,
        ratingCount,
        favourCount,
        imageUrl: source || fallback,
        metricText
      }
    })
  },

  formatDate(value) {
    if (!value) return '新上架'
    const date = value instanceof Date ? value : new Date(value)
    if (isNaN(date.getTime())) return '新上架'
    return `${date.getMonth() + 1}月${date.getDate()}日`
  },

  switchBoard(event) {
    const key = event.currentTarget.dataset.key
    if (!key || key === this.data.activeBoard) return
    const boards = this._boards || {}
    this.setData({
      activeBoard: key,
      boardDishes: boards[key] || []
    })
  },

  goDishDetail(event) {
    const { id, dishid } = event.currentTarget.dataset
    if (!id) return
    wx.navigateTo({
      url: `/pages/dishDetail/index?id=${id}&dishId=${dishid}`
    })
  },

  goCanteenList() {
    wx.navigateTo({ url: '/pages/canteen/canteen' })
  },

  goDishSearch() {
    wx.navigateTo({ url: '/pages/search/index' })
  },

  goIntroDetail() {
    wx.navigateTo({ url: '/pages/intro/index' })
  },

  onChange(event) {
    const name = event.detail
    if (name === 'canteen') {
      wx.navigateTo({ url: '/pages/canteen/canteen' })
    } else if (name === 'user') {
      wx.navigateTo({ url: '/pages/user/user' })
    }
  }
})