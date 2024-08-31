const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { markAttendance, getAttendanceByDate, getAllAttendance, getFilteredAttendance, getEmailAttendance, getAttendanceWithDistances } = require('../controllers/attendaceController');
const multer = require('multer');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.use(requireAuth);

router.post('/', upload.single('image'), markAttendance);
router.get('/', getAttendanceByDate);
router.get('/all', getAllAttendance);
router.get('/filtered', getFilteredAttendance);
router.get('/user', getEmailAttendance);

router.get('/with-distances', getAttendanceWithDistances);

module.exports = router;
