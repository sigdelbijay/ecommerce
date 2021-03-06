const { Order, CartItem } = require('../models/order')
const { errorHandler } = require('../helpers/dbErrorHandler')

exports.create = (req, res) => {
  req.body.order.user = req.profile
  const order = new Order(req.body.order)
  order.save((err, data) => {
    if (err) {
      return res.status(400).json({ error: errorHandler(err) })
    }
    res.json(data)
  })
}

exports.listOrders = (req, res) => {
  Order.find()
    .populate('user', '_id name address')
    .sort('-createdAt')
    .exec((err, orders) => {
      if (err) {
        return res.status(400).json({ error: errorHandler(err) })
      }
      res.json(orders)
    })
}

exports.getStatusValues = (req, res) => {
  res.json(Order.schema.path('status').enumValues)
}

exports.updateOrderStatus = (req, res) => {
  Order.update(
    { _id: req.body.orderId },
    { $set: {status: req.body.status} },
    (err, data) => {
      if (err) {
        return res.status(400).json({ error: errorHandler(err) });
      }
      return res.json(data)
    }
  )
}

exports.orderById = (req, res, next, id) => {
  Order.findById(id).populate('products.product', 'name price').exec((err, order) => {
    if (err || !order) {
      return res.json(400).json({ error: errorHandler(err) });
    }
    req.order = order
    next()
  })
}