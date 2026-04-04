const { getAllUsers } = require('../services/firebase.service');
const { sendError } = require('../utils/apiResponse');
const logger = require('../utils/logger');

exports.getAllUsers = async (req, res) => {
  try {
    let users = await getAllUsers();
    users = users.map(u => ({ ...u, likedSongs: undefined }));
    res.json(users);
  } catch (err) {
    logger.error('getAllUsers error:', { error: err.message });
    res.status(500).json({ error: err.message });
  }
};
