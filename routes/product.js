const express = require('express')
const router = express.Router()

const { create, productById, read, remove, update, list, listRelated, listCategories, listBySearch, photo } = require('../controllers/product')
const {userById} = require('../controllers/user')
const { requireSignin, isAuth, isAdmin } = require('../controllers/auth')

router.param('userId', userById)
router.param('productId', productById)
router.get('/product/:productId', read)
router.delete('/product/:productId/:userId', requireSignin, isAuth, isAdmin, remove)
router.put('/product/:productId/:userId', requireSignin, isAuth, isAdmin, update)
router.post('/product/create/:userId', requireSignin, isAuth, isAdmin, create)
router.get('/products', list)
router.get('/products/related/:productId', listRelated)
router.get('/products/categories', listCategories)
router.post('/products/by/search', listBySearch)
router.get('/product/photo/:productId', photo)

module.exports = router