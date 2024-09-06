const Attendance = require('../models/attendanceModel');
const User = require('../models/userModel');
const cloudinary = require('cloudinary').v2;
const { Buffer } = require('buffer');
const sharp = require('sharp');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const GMAP_API_KEY = process.env.GMAP_API_KEY;

const compressImageToTargetSize = async (buffer, maxSizeInKB) => {
  let quality = 100;
  let resizedBuffer = buffer;

  while (quality > 10) {
    const compressedBuffer = await sharp(buffer)
      .jpeg({ quality })
      .toBuffer();

    if (compressedBuffer.length / 1024 <= maxSizeInKB) {
      resizedBuffer = compressedBuffer;
      break;
    }

    quality -= 10;
  }

  return resizedBuffer;
};


const getLocationName = async (lat, lng) => {
  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=street_address&key=${GMAP_API_KEY}`);
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Geocoding API error: ${data.status}`);
    }

    if (data.results.length > 0) {
      return data.results[0].formatted_address;
    } else {
      throw new Error("No results found");
    }
  } catch (error) {
    console.error("Error fetching location name:", error);
    return "Unknown location";
  }
};

const markAttendance = async (req, res) => {
  const { location, image, purpose, feedback } = req.body; // 'purpose' field added

  if (!image) {
    return res.status(400).json({ error: "Image is required" });
  }

  if (!location) {
    return res.status(400).json({ error: "Location is required" });
  }

  if (!purpose) {
    return res.status(400).json({ error: "Purpose of visit is required" });
  }

  // Convert base64 string to buffer
  const matches = image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return res.status(400).json({ error: "Invalid image format" });
  }
  const type = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');

  // Resize and reduce the quality of the image using sharp
  try {
    const maxSizeInKB = 10; // Max size in KB
    const resizedBuffer = await compressImageToTargetSize(buffer, maxSizeInKB);

    // Upload resized image to Cloudinary
    cloudinary.uploader.upload_stream({ resource_type: 'image' }, async (error, result) => {
      if (error) {
        console.error("Cloudinary upload error:", error);
        return res.status(500).json({ error: "Cloudinary upload failed" });
      }

      try {
        const imageUrl = result.secure_url;
        const timestamp = new Date();
        const parsedLocation = JSON.parse(location);
        const locationName = await getLocationName(parsedLocation.lat, parsedLocation.lng);

        const attendance = new Attendance({
          image: imageUrl,
          location: parsedLocation,
          locationName,
          purpose, // Save the purpose of visit
          feedback,
          date: new Date().toISOString().split('T')[0], // Save only the date part
          timestamp,
          user: req.user._id,
        });

        await attendance.save();
        res.status(201).json({ message: "Attendance saved successfully" });
      } catch (error) {
        console.error("Error saving attendance:", error);
        res.status(500).json({ error: "Server error" });
      }
    }).end(resizedBuffer);
  } catch (error) {
    console.error("Error processing image:", error);
    res.status(500).json({ error: "Error processing image" });
  }
};


const getAttendanceByDate = async (req, res) => {
  const { date } = req.query;
  const userId = req.user._id;

  const startDate = new Date(date);
  startDate.setUTCHours(0, 0, 0, 0); // Start of the day in UTC

  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 1); // End of the day in UTC

  try {
    const attendances = await Attendance.find({
      user: userId,
      timestamp: {
        $gte: startDate,
        $lt: endDate,
      },
    });

    res.status(200).json(attendances);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const getAllAttendance = async (req, res) => {
  const userId = req.user._id;

  try {
    const attendances = await Attendance.find({ user: userId }).sort({ timestamp: 1 });

    res.status(200).json(attendances);
  } catch (error) {
    console.error("Error fetching all attendance:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const getFilteredAttendance = async (req, res) => {
  const { state, startDate, endDate } = req.query;

  try {
    const usersInState = await User.find({ state }).distinct('_id');

    // Parse the start and end dates
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date(start);
    end.setUTCHours(23, 59, 59, 999);

    const attendances = await Attendance.find({
      user: { $in: usersInState },
      timestamp: { $gte: start, $lt: end },
    }).populate('user', 'email fullName phoneNumber reportingManager');

    res.status(200).json(attendances);
  } catch (error) {
    console.error("Error fetching filtered attendance:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const getEmailAttendance = async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const attendanceData = await Attendance.find({ user: user._id })
      .populate('user', 'email fullName phoneNumber reportingManager'); // Populate user fields

    res.status(200).json(attendanceData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const calculateDistanceBetweenPoints = async (locations) => {
  const origins = locations.slice(0, -1).map(loc => `${loc.lat},${loc.lng}`);
  const destinations = locations.slice(1).map(loc => `${loc.lat},${loc.lng}`);

  const params = new URLSearchParams({
    origins: origins.join('|'),
    destinations: destinations.join('|'),
    key: GMAP_API_KEY,
  });

  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params}`);
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Distance Matrix API error: ${data.status}`);
    }

    return data.rows.map(row => row.elements[0].distance.text);
  } catch (error) {
    console.error("Error calculating distances:", error);
    throw new Error("Error calculating distances");
  }
};

const getAttendanceWithDistances = async (req, res) => {
  const { date } = req.query;
  const userId = req.user._id;

  const startDate = new Date(date);
  startDate.setUTCHours(0, 0, 0, 0); // Start of the day in UTC

  const endDate = new Date(startDate);
  endDate.setUTCHours(23, 59, 59, 999); // End of the day in UTC

  try {
    const attendances = await Attendance.find({
      user: userId,
      timestamp: {
        $gte: startDate,
        $lt: endDate,
      },
    });

    if (attendances.length > 1) {
      const locations = attendances.map(attendance => attendance.location);
      const distances = await calculateDistanceBetweenPoints(locations);

      attendances.forEach((attendance, index) => {
        if (index > 0) {
          attendance._doc.distanceFromPrevious = distances[index - 1];
        }
      });
    }

    res.status(200).json(attendances);
  } catch (error) {
    console.error("Error fetching attendance with distances:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const getAttendanceSummary = async (req, res) => {
  const { startDate, endDate, holidays } = req.query;
  const userId = req.user._id;

  try {
    // Parse the start and end dates
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);  // Ensure full day coverage
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);  // End of the day

    // Convert holiday dates into an array and filter future holidays
    const holidayArray = holidays.split(',').map(date => new Date(date));
    const holidaySet = new Set(holidayArray); // For faster lookups

    const currentDate = new Date();

    // Filter holidays that haven't occurred yet (future holidays)
    const futureHolidays = holidayArray.filter(holiday => holiday > currentDate && holiday <= end);

    // Fetch attendance records for the given user and date range
    const attendances = await Attendance.find({
      user: userId,
      timestamp: {
        $gte: start,
        $lte: end,
      },
    });

    // Extract attendance dates
    const presentDays = new Set(attendances.map(a => a.date));

    // Calculate total number of days between start and end date
    const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Subtract total holidays from total days to get working days
    const workDays = totalDays - holidaySet.size;

    // Get the current year and month
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get the last day of the current month
    const lastDayOfMonth = new Date(year, month + 1, 0); // Day 0 gives the last day of the previous month

    // Calculate the difference in time (milliseconds)
    const diffTime = lastDayOfMonth.getTime() - currentDate.getTime();

    // Convert milliseconds to days (1 day = 24 * 60 * 60 * 1000 ms)
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Calculate absent days (workDays - present days) + future holidays count, ensuring no negative values
    let absentDays = workDays - presentDays.size - daysLeft + futureHolidays.length;
    absentDays = Math.max(0, absentDays); // Ensure absent days are not negative

    res.status(200).json({
      holidays: holidaySet.size,
      present: presentDays.size,
      absent: absentDays,
      futureHolidays: futureHolidays.length,  // To track future holidays
      workDays,
    });
  } catch (error) {
    console.error("Error fetching attendance summary:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { markAttendance, getAttendanceByDate, getAllAttendance, getFilteredAttendance, getEmailAttendance, getLocationName, getAttendanceWithDistances, getAttendanceSummary };
