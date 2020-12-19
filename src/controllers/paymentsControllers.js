const express = require('express');
const models = require('../models');

const checkout = async (req, res) => {
  const { products, delivery_method, delivery_time } = req.body;
  let subtotal = 0;
  for (const item of products) {
    const product = await models.products.findOne({
      where: {
        id: item.product_id
      }
    })
    if ((product.dataValues.stock - item.qty) < 0) {
      return res.status(400).json({
        'status': '400',
        'messages': `Stock product ${product.dataValues.name} tidak tersedia`
      })
    }
    subtotal += (product.dataValues.price * item.qty)
  }
  const tax_fee = subtotal * 0.1
  const shipping = delivery_method === 'home delivery' ? 10000 : 0
  const total = subtotal + tax_fee + shipping
  models.order.create({
    user_id: req.userId,
    subtotal,
    tax_fee,
    shipping,
    total,
    status_order: 'new order',
    delivery_method,
    delivery_time
  })
    .then(async (order) => {
      products.map(async product => {
        models.order_detail.create({
          product_id: product.product_id,
          order_id: order.dataValues.id,
          qty: product.qty
        })
        const result = await models.products.findOne({
          where: {
            id: product.product_id
          }
        })
        const stock = result.dataValues.stock - product.qty
        await models.products.update({
          stock: stock > 0 ? stock : 0 
        }, {
          where: {
            id: product.product_id
          }
        })
      })
      if (order) {
        res.status(200).json({
          'status': 'OK',
          'messages': 'Order berhasil dibuat'
        })
      } else {
        res.status(400).json({
          'status': '400',
          'messages': 'Order gagal dibuat',
          'data': {}
        })
      }
    })
    .catch((err) => {
      res.status(500).json({
        'status': 'ERROR',
        'messages': err.message,
        'data': null,
      })
    })
}

const detailOrder = (req, res) => {
  const { id } = req.params
  models.order.findOne({
    include: [{
      model: models.order_detail
    }],
    where: {
      id
    }
  })
    .then((result) => {
      if (result) {
        res.status(200).json({
          'status': 'OK',
          'messages': 'Berhasil get detail order',
          'data': result
        })
      } else {
        res.status(400).json({
          'status': '400',
          'messages': 'Gagal get detail order',
          'data': {}
        })
      }
    })
    .catch((err) => {
      res.status(500).json({
        'status': 'ERROR',
        'messages': err.message,
        'data': null,
      })
    })
}

const confirmAndPay = (req, res) => {
  const { order_id, address, customer_phone, payment_method_id } = req.body
  models.order.update({
    address,
    customer_phone,
    payment_method_id,
    status_order: 'paid'
  },{
    where: {
      id: order_id
    }
  })
    .then((result) => {
      if (result) {
        res.status(200).json({
          'status': '200',
          'messages': 'Berhasil dikonfirmasi & dibayar'
        })
      } else {
        res.status(400).json({
          'status': '400',
          'messages': 'Gagal dikonfirmasi & dibayar',
          'data': {}
        })
      }
    })
    .catch((err) => {
      res.status(500).json({
        'status': 'ERROR',
        'messages': err.message,
        'data': null,
      })
    })
}

const markAsDone = (req, res) => {
  const { order_id } = req.body
  models.order.update({
      status_order: 'done'
  },
  {
      where: {
        id: order_id
      }
    })
    .then((result) => {
      if (result === 1) {
        res.status(200).json({
          'status': 'OK',
          'messages': 'Pesanan selesai'
        })
      } else {
        res.status(400).json({
          'status': '400',
          'messages': 'Pesanan gagl',
          'data': {}
        })
      }
    })
    .catch((err) => {
      res.status(500).json({
        'status': 'ERROR',
        'messages': err.message,
        'data': null,
      })
    })
}

module.exports = { checkout, detailOrder, confirmAndPay, markAsDone }