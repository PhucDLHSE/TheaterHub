const express = require('express');
const router = express.Router();
const {createLocation, getAllLocations, getLocationById, updateLocation, deleteLocation, getLocationsWithoutSeats, getSeatedLocationsWithoutSeats} = require('../controllers/locationController');
const { verifyToken, ensureStaff } = require('../middlewares/jwtAuth');

// POST /api/locations
router.post('/', verifyToken,ensureStaff, createLocation);

// GET /api/locations
router.get('/', getAllLocations);

// GET /api/locations/seated-no-seats
router.get('/seated-no-seats', verifyToken, ensureStaff, getSeatedLocationsWithoutSeats);

// GET /api/locations/no-seats
router.get('/no-seats', verifyToken, ensureStaff, getLocationsWithoutSeats);

// GET /api/locations/:id
router.get('/:id', getLocationById);

// PUT /api/locations/:id
router.patch('/:id', verifyToken,ensureStaff, updateLocation);

// DELETE /api/locations/:id
router.delete('/:id', verifyToken,ensureStaff, deleteLocation);




module.exports = router;
