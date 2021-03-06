const Product = require('../models/product')
const formidable = require('formidable')
const _ = require('lodash')
const fs = require('fs')
const { errorHandler } = require('../helpers/dbErrorHandler')
const mongoose = require('mongoose')
const product = require('../models/product')
const {ObjectId} = mongoose.Types

exports.create = (req, res) => {
  //to get form data
  let form = new formidable.IncomingForm()
  form.keepExtensions = true
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: 'Image could not be uploaded'
      })
    }

    //check for all fields
    const { name, description, price, category, quantity, photo } = fields
    if (!name || !description || !price || !category || !quantity) {
      return res.status(400).json({
        error: 'All fields are required'
      })
    }

    let product = new Product(fields)
    //sending file with name photo
    //file sixe 1kb = 1000
    if (files.photo) {
      if (files.photo.size > 1000000) {
        return res.status(400).json({
          error: 'Image should be less than 1MB in size'
        })
      }
      product.photo.data = fs.readFileSync(files.photo.path)
      product.photo.contentType = files.photo.type
    }

    product.save((err, result) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err)
        })
      }
      res.json({result})
    })
  })
}

exports.productById = (req, res, next, id) => {
  Product.findById(id)
    .populate('category')
    .exec((err, product) => {
    if (err || !product) {
      return res.status(404).json({
        error: "Product not found"
      })
    }
    req.product = product
    next()
  })
}

exports.read = (req, res) => {
  req.product.photo = undefined
  res.json(req.product)
}

exports.remove = (req, res) => {
  let product = req.product
  product.remove((err, deletedProduct) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err)
      })
    }
    res.json({
      message: "Product deleted successfully"
    })
  })
}

exports.update = (req, res) => {
  //to get form data
  let form = new formidable.IncomingForm()
  form.keepExtensions = true
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: 'Image could not be uploaded'
      })
    }

    //check for all fields
    // const { name, description, price, category, quantity, photo } = fields
    // if (!name || !description || !price || !category || !quantity) {
    //   return res.status(400).json({
    //     error: 'All fields are required'
    //   })
    // }

    let product = req.product
    //replace existing fields with new fields
    product = _.extend(product, fields)
    if (files.photo) {
      if (files.photo.size > 1000000) {
        return res.status(400).json({
          error: 'Image should be less than 1MB in size'
        })
      }
      product.photo.data = fs.readFileSync(files.photo.path)
      product.photo.contentType = files.photo.type
    }

    product.save((err, result) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err)
        })
      }
      res.json(result)
    })
  })
}

// sell/arrival
// by sell = /products?sortBy=sold&order=desc&limit=4
// by sell = /products?sortBy=createdAt&order=desc&limit=4
// if no params are sent, then all products are returned

exports.list = (req, res) => {
  let order = req.query.order || 'asc'
  let sortBy = req.query.sortBy || '_id'
  let limit = parseInt(req.query.limit) || 6

  Product.find()
    .select("-photo")
    .populate('category')
    .sort([[sortBy, order]])
    .limit(limit)
    .exec((err, products) => {
      if (err) {
        return res.status(400).json({
          error: "Products not found"
        })
      }
      res.json(products)
    })
}

//find products based on the request product category
//other products that has the same category will be returned
exports.listRelated = (req, res) => {
  let limit = req.query.limit || 6
  product.find({ _id: { $ne: req.product }, category: req.product.category })
    .limit(limit)
    .populate('category', '_id name') //populate category but populate id and name from category only
    .exec((err, products) => {
      if (err) {
        return res.status(400).json({
          error: "Product not found"
        })
      }

      res.json(products)
    })
}

exports.listCategories = (req, res) => {
  Product.distinct("category", {}, (err, categories) => {
    if (err) {
      return res.status(400).json({
        error: "Categories not found"
      })
    }
    res.json(categories)
  })
}

/**
 * list products by search
 * we will implement product search in react frontend
 * we will show categories in checkbox and price range in radio buttons
 * as the user clicks on those checkbox and radio buttons
 * we will make api request and show the products to users based on what he wants
 */
 
exports.listBySearch = (req, res) => {
  let order = req.body.order ? req.body.order : "desc";
  let sortBy = req.body.sortBy ? req.body.sortBy : "_id";
  let limit = req.body.limit ? parseInt(req.body.limit) : 100;
  let skip = parseInt(req.body.skip);
  let findArgs = {};

  // console.log(order, sortBy, limit, skip, req.body.filters);
  // console.log("findArgs", findArgs);

  for (let key in req.body.filters) {
      if (req.body.filters[key].length > 0) {
          if (key === "price") {
              // gte -  greater than price [0-10]
              // lte - less than
              findArgs[key] = {
                  $gte: req.body.filters[key][0],
                  $lte: req.body.filters[key][1]
              };
          } else {
              findArgs[key] = req.body.filters[key];
          }
      }
  }

  Product.find(findArgs)
      .select("-photo") //disselect photo
      .populate("category")
      .sort([[sortBy, order]])
      .skip(skip)
      .limit(limit)
      .exec((err, data) => {
          if (err) {
              return res.status(400).json({
                  error: "Products not found"
              });
          }
          res.json({
              size: data.length,
              data
          });
      });
};

exports.photo = (req, res, next) => {
  if (req.product.photo.data) {
    res.set('Content-Type', req.product.photo.contentType)
    return res.send(req.product.photo.data)
  }
  next()
}

exports.listSearch = (req, res, next) => {
  //crete query object to hold search value and category value
  const query = {}
  //assign search value to query.name
  if (req.query.search) {
    query.name = { $regex: req.query.search, $options: 'i' }
    //assign category value to query.category
    if (req.query.category && req.query.category != 'All') {
      query.category = req.query.category
    }

    Product.find(query, (err, products) => {
      if (err) {
        return res.status(400).json({
          error: errHandler(err)
        })
      }
      res.json(products)
    }).select('-photo')
  }
}

exports.decreaseQuantity = (req, res, next) => {
  let bulkOps = req.body.order.products.map((product) => {
    return {
      updateOne: {
        filter: { _id: product._id },
        update: {$inc: {quantity: -product.count, sold: +product.count}}
      }
    }
  })

  Product.bulkWrite(bulkOps, {}, (err, data) => {
    if (err) {
      return res.status(400).json({
        error: 'Could not update product'
      })
    }
    next()
  })
}
