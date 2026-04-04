const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/verifyToken');
const isAdmin = require('../../middleware/isAdmin');
const usersController = require('./users.controller');

router.get('/', verifyToken, isAdmin, usersController.getAllUsers);

module.exports = router;