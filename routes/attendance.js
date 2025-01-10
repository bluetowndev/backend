const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { markAttendance, getAttendanceByDate, getAllAttendance, getFilteredAttendance, getEmailAttendance, getAttendanceWithDistances, getAttendanceSummary, saveTotalDistance, getUsersWithoutCheckIn, getUsersWithoutCheckOut, getUsersOnLeave, getUserVisitCounts, getUsersWithoutAttendance } = require('../controllers/attendaceController');
const multer = require('multer');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.use(requireAuth);

router.post('/', upload.single('image'), markAttendance);
router.get('/', getAttendanceByDate);
router.get('/all', getAllAttendance);
router.get('/filtered', getFilteredAttendance);
router.get('/user', getEmailAttendance);
router.get('/summary', getAttendanceSummary);
router.get('/with-distances', getAttendanceWithDistances);
router.post('/save-total-distance', saveTotalDistance);
router.get('/no-checkin', getUsersWithoutCheckIn);
router.get('/no-checkout', getUsersWithoutCheckOut);
router.get('/onLeave', getUsersOnLeave);
router.get('/siteCount', getUserVisitCounts);
router.get('/absent', getUsersWithoutAttendance)

module.exports = router;
