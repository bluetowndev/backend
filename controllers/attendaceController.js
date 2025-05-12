const Attendance = require('../models/attendanceModel');
const User = require('../models/userModel');
const cloudinary = require('cloudinary').v2;
const { Buffer } = require('buffer');
const sharp = require('sharp');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const TotalDistance = require('../models/distanceModel');

//Configuration of cloudinary for converting the images into an url
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const GMAP_API_KEY = process.env.GMAP_API_KEY;

//reducing the size of images to be less than 10kb
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

//Function to fetch location name from the latitude and longitude
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
  // console.log("Request Body:", req.body);
  const { location, image, purpose, feedback, subPurpose } = req.body;
  if (!image) return res.status(400).json({ error: "Image is required" });
  if (!location) return res.status(400).json({ error: "Location is required" });
  if (!purpose) return res.status(400).json({ error: "Purpose of visit is required" });

  const matches = image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return res.status(400).json({ error: "Invalid image format" });
  }
  const buffer = Buffer.from(matches[2], "base64");

  try {
    const maxSizeInKB = 10;
    const resizedBuffer = await compressImageToTargetSize(buffer, maxSizeInKB);

    cloudinary.uploader.upload_stream({ resource_type: "image" }, async (error, result) => {
      if (error) return res.status(500).json({ error: "Cloudinary upload failed" });

      try {
        const imageUrl = result.secure_url;
        const timestamp = new Date();
        const parsedLocation = JSON.parse(location);
        const locationName = await getLocationName(parsedLocation.lat, parsedLocation.lng);

        const attendance = new Attendance({
          image: imageUrl,
          location: parsedLocation,
          locationName,
          purpose,
          subPurpose,
          feedback,
          date: new Date().toISOString().split("T")[0],
          timestamp,
          user: req.user._id,
        });

        await attendance.save();
        res.status(201).json({ message: "Attendance saved successfully" });
      } catch (error) {
        res.status(500).json({ error: "Server error" });
      }
    }).end(resizedBuffer);
  } catch (error) {
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
    let usersInState;

    if (state === "all" || !state) {
      usersInState = await User.find().distinct('_id'); // Get all users if 'all' is selected
    } else {
      usersInState = await User.find({ state }).distinct('_id'); // Get users from the specific state
    }

    // Parse the start and end dates
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date(start);
    end.setUTCHours(23, 59, 59, 999);

    const attendances = await Attendance.find({
      user: { $in: usersInState },
      timestamp: { $gte: start, $lt: end },
    }).populate('user', 'email state fullName phoneNumber reportingManager');

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
  const origins = locations.slice(0, -1).map((loc) => `${loc.lat},${loc.lng}`);
  const destinations = locations.slice(1).map((loc) => `${loc.lat},${loc.lng}`);

  const params = new URLSearchParams({
    origins: origins.join('|'),
    destinations: destinations.join('|'),
    key: GMAP_API_KEY,
  });

  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params}`);
    const data = await response.json();

    // console.log("API Response Data:", JSON.stringify(data, null, 2)); // Debugging API response

    if (data.status !== 'OK' || !data.rows) {
      throw new Error(`Distance Matrix API error: ${data.status}`);
    }

    // Parse and log valid distances
    const distances = data.rows.map((row, index) => {
      const element = row.elements[index]; // Use matching index pairing
      if (element && element.status === 'OK' && element.distance) {
        // console.log(
        //   `From: ${origins[index]} To: ${destinations[index]} - Distance: ${element.distance.text}`
        // );
        return element.distance.text;
      } else {
        console.warn(`Invalid distance data for index ${index}`);
        return "0 m";
      }
    });

    return distances;
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
          attendance._doc.distanceFromPrevious = distances[index - 1] || "0 m";
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

const saveTotalDistance = async (req, res) => {
  const userId = req.user._id; // Assuming user ID is stored in `req.user` via authentication middleware
  const { date, totalDistance, pointToPointDistances } = req.body;

  let numericDistance;
  try {
    if (typeof totalDistance === "string") {
      let distance = totalDistance.trim();
      if (distance.includes("km")) {
        const [km, m] = distance.split(" km ");
        numericDistance = (parseFloat(km) || 0) + (parseFloat(m) || 0) / 1000; // Convert to km
      } else if (distance.includes("m")) {
        numericDistance = parseFloat(distance) / 1000; // Convert meters to kilometers
      } else {
        numericDistance = parseFloat(distance) / 1000; // Default conversion to km
      }
    } else if (typeof totalDistance === "number") {
      numericDistance = totalDistance; // Already a number
    } else {
      throw new Error("Invalid totalDistance type");
    }
  } catch (err) {
    return res.status(400).json({ message: "Failed to parse totalDistance." });
  }

  if (isNaN(numericDistance)) {
    return res.status(400).json({ message: "Invalid total distance value." });
  }

  // Validate and enrich pointToPointDistances
  const enrichedPointToPointDistances = [];
  if (Array.isArray(pointToPointDistances)) {
    pointToPointDistances.forEach((point) => {
      const { from, to, distance, transitTime } = point;
      if (!from || !to || typeof distance !== "number") {
        return; // Skip invalid entries
      }

      enrichedPointToPointDistances.push({
        from,
        to,
        distance,
        transitTime: transitTime || null, // Default to null if transitTime is not provided
      });
    });
  }

  try {
    const updateData = {
      totalDistance: numericDistance, // Store the total distance in kilometers
    };

    if (enrichedPointToPointDistances.length > 0) {
      updateData.pointToPointDistances = enrichedPointToPointDistances;
    }

    const totalDistanceRecord = await TotalDistance.findOneAndUpdate(
      { userId, date },
      updateData,
      { upsert: true, new: true }
    );

    const message =
      enrichedPointToPointDistances.length > 0
        ? "Total distance and point-to-point distances with locations and transit time saved successfully."
        : "Total distance saved successfully without point-to-point details.";

    res.status(200).json({ message, totalDistanceRecord });
  } catch (error) {
    console.error("Error saving total distance:", error);
    res.status(500).json({ message: error.message });
  }
};

const getUsersWithoutCheckIn = async (req, res) => {
  try {
    // Get the current date in 'YYYY-MM-DD' format
    const currentDate = new Date().toISOString().split('T')[0];

    // Step 1: Use aggregation to find users who have made "Check In" entries for the current date
    const usersWithCheckIn = await Attendance.aggregate([
      {
        $match: { purpose: 'Check In', date: currentDate }, // Find all "Check In" entries for today
      },
      {
        $group: { _id: '$user' }, // Group by user ID to get unique users who checked in
      },
    ]);

    // Step 2: Use aggregation to find users who have made "On Leave" entries for the current date
    const usersOnLeave = await Attendance.aggregate([
      {
        $match: { purpose: 'On Leave', date: currentDate }, // Find all "On Leave" entries for today
      },
      {
        $group: { _id: '$user' }, // Group by user ID to get unique users who are on leave
      },
    ]);

    // Step 3: Extract IDs of users who have checked in or are on leave
    const userIdsWithCheckInOrOnLeave = [
      ...new Set([
        ...usersWithCheckIn.map((entry) => entry._id),
        ...usersOnLeave.map((entry) => entry._id),
      ]),
    ];

    // Step 4: Define exclusion criteria
    const excludedEmails = [
      'rit.parmar@bluetown.com',
      'anuj.sonkar@bluetown.com',
      'ajay.jha@bluetown.com',
      'cb@bluetown.com',
      'shiv.hundawal@bluetown.com',
      'partha.ghosh@bluetown.com',
      'punit.kumar@bluetown.com',
      'sharat.jha@bluetown.com',
      'pankaj.tiwari@bluetown.com',
      'pushpraj.pachori@bluetown.com',
      'test@test.com',
    ];

    // Step 5: Find attendance entries for users NOT in the above list and NOT from Delhi state
    const attendanceEntries = await Attendance.find({
      user: { $nin: userIdsWithCheckInOrOnLeave }, // Exclude users who checked in or are on leave
      date: currentDate,
    })
      .populate('user')
      .lean(); // Convert mongoose documents to plain JavaScript objects

    // Step 6: Filter out users based on exclusion criteria
    const usersNotCheckedIn = attendanceEntries
      .filter(
        (entry) =>
          entry.user && // Ensure user is not null
          !excludedEmails.includes(entry.user.email) && // Exclude specific emails
          entry.user.state !== 'Delhi' // Exclude users from Delhi
      )
      .map((entry) => {
        const { fullName, state, email, phoneNumber, reportingManager } = entry.user;
        return { fullName, state, email, phoneNumber, reportingManager };
      });

    // Step 7: Remove duplicates (users may have multiple attendance entries)
    const uniqueUsers = [];
    const seenUserEmails = new Set();

    for (const user of usersNotCheckedIn) {
      if (!seenUserEmails.has(user.email)) {
        uniqueUsers.push(user);
        seenUserEmails.add(user.email);
      }
    }

    // Respond with the list of unique users
    res.status(200).json({ success: true, data: uniqueUsers });
  } catch (error) {
    console.error('Error fetching users not checked in today:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};


const getUsersWithoutCheckOut = async (req, res) => {
  try {
    // Get the current date in 'YYYY-MM-DD' format
    const currentDate = new Date().toISOString().split('T')[0];

    // Step 1: Use aggregation to find users who have made "Check Out" entries for the current date
    const usersWithCheckOut = await Attendance.aggregate([
      {
        $match: { purpose: 'Check Out', date: currentDate }, // Find all "Check Out" entries for today
      },
      {
        $group: { _id: '$user' }, // Group by user ID to get unique users who checked out
      },
    ]);

    // Step 2: Use aggregation to find users who have made "On Leave" entries for the current date
    const usersOnLeave = await Attendance.aggregate([
      {
        $match: { purpose: 'On Leave', date: currentDate }, // Find all "On Leave" entries for today
      },
      {
        $group: { _id: '$user' }, // Group by user ID to get unique users who are on leave
      },
    ]);

    // Step 3: Extract IDs of users who have checked out or are on leave
    const userIdsWithCheckOutOrOnLeave = [
      ...new Set([
        ...usersWithCheckOut.map((entry) => entry._id),
        ...usersOnLeave.map((entry) => entry._id),
      ]),
    ];

    // Step 4: Define exclusion criteria
    const excludedEmails = [
      'rit.parmar@bluetown.com',
      'anuj.sonkar@bluetown.com',
      'ajay.jha@bluetown.com',
      'cb@bluetown.com',
      'shiv.hundawal@bluetown.com',
      'partha.ghosh@bluetown.com',
      'punit.kumar@bluetown.com',
      'sharat.jha@bluetown.com',
      'pankaj.tiwari@bluetown.com',
      'pushpraj.pachori@bluetown.com',
      'test@test.com',
    ];

    // Step 5: Find attendance entries for users NOT in the above list and NOT from Delhi state
    const attendanceEntries = await Attendance.find({
      user: { $nin: userIdsWithCheckOutOrOnLeave }, // Exclude users who checked out or are on leave
      date: currentDate,
    })
      .populate('user')
      .lean(); // Convert mongoose documents to plain JavaScript objects

    // Step 6: Filter out users based on exclusion criteria
    const usersNotCheckedOut = attendanceEntries
      .filter(
        (entry) =>
          entry.user && // Ensure user is not null
          !excludedEmails.includes(entry.user.email) && // Exclude specific emails
          entry.user.state !== 'Delhi' // Exclude users from Delhi
      )
      .map((entry) => {
        const { fullName, state, email, phoneNumber, reportingManager } = entry.user;
        return { fullName, state, email, phoneNumber, reportingManager };
      });

    // Step 7: Remove duplicates (users may have multiple attendance entries)
    const uniqueUsers = [];
    const seenUserEmails = new Set();

    for (const user of usersNotCheckedOut) {
      if (!seenUserEmails.has(user.email)) {
        uniqueUsers.push(user);
        seenUserEmails.add(user.email);
      }
    }

    // Respond with the list of unique users
    res.status(200).json({ success: true, data: uniqueUsers });
  } catch (error) {
    console.error('Error fetching users not checked out today:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};


const getUsersOnLeave = async (req, res) => {
  try {
    // Get the current date in 'YYYY-MM-DD' format
    const currentDate = new Date().toISOString().split('T')[0];

    // Step 1: Find attendance entries with "On Leave" purpose for the current date
    const attendanceEntries = await Attendance.find({
      purpose: 'On Leave',
      date: currentDate,
    }).populate('user');

    // Step 2: Extract user details, skipping null users
    const usersOnLeave = attendanceEntries
      .filter((entry) => entry.user) // Ensure user is not null
      .map((entry) => {
        const { fullName, state, email, phoneNumber, reportingManager } = entry.user;
        return { fullName, state, email, phoneNumber, reportingManager };
      });

    // Step 3: Remove duplicates (users may have multiple attendance entries)
    const uniqueUsers = [];
    const seenUserEmails = new Set();

    for (const user of usersOnLeave) {
      if (!seenUserEmails.has(user.email)) {
        uniqueUsers.push(user);
        seenUserEmails.add(user.email);
      }
    }

    // Respond with the list of unique users
    res.status(200).json({ success: true, data: uniqueUsers });
  } catch (error) {
    console.error('Error fetching users on leave:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

const getUserVisitCounts = async (req, res) => {
  try {
    // Extract start and end dates from request query
    const { startDate, endDate } = req.query;
    
    // Get the current date in 'YYYY-MM-DD' format if no date range is provided
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Define date filter based on input
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = { date: { $gte: startDate, $lte: endDate } };
    } else {
      dateFilter = { date: currentDate };
    }

    // Define excluded purposes
    const excludedPurposes = ['Check In', 'Check Out', 'On Leave'];

    // Aggregate attendance data for the given date range or current date
    const visitCounts = await Attendance.aggregate([
      {
        $match: {
          ...dateFilter, // Apply dynamic date filter
          purpose: { $nin: excludedPurposes },
        },
      },
      {
        $group: {
          _id: { user: '$user', date: '$date' }, // Group by user ID and date
          visitCount: { $sum: 1 }, // Count occurrences
        },
      },
      {
        $lookup: {
          from: 'users', // Reference the Users collection
          localField: '_id.user',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      {
        $unwind: '$userDetails', // Unwind the user details array
      },
      {
        $project: {
          _id: 0,
          date: '$_id.date',
          fullName: '$userDetails.fullName',
          email: '$userDetails.email',
          phoneNumber: '$userDetails.phoneNumber',
          state: '$userDetails.state',
          reportingManager: '$userDetails.reportingManager',
          visitCount: 1, // Include visit count
        },
      },
      {
        $sort: { date: 1 } // Sort records by date
      }
    ]);

    // Respond with the visit counts
    res.status(200).json({ success: true, data: visitCounts });
  } catch (error) {
    console.error('Error fetching user visit counts:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};


const getUsersWithoutAttendance = async (req, res) => {
  try {
    const todayDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format

    // Fetch users who marked attendance for the current day
    const usersWithAttendance = await Attendance.find({ date: todayDate }).distinct('user');

    // Emails to exclude
    const excludedEmails = ['rit.parmar@bluetown.com', 'cb@bluetown.com'];

    // Fetch users who have not marked attendance, exclude specific states and emails, ensure role is 'user'
    const usersWithoutAttendance = await User.find({
      _id: { $nin: usersWithAttendance }, // Exclude users with attendance
      state: { $nin: ['Delhi', 'Denmark'] }, // Exclude Delhi and Denmark states
      role: 'user', // Ensure role is 'user'
      email: { $nin: excludedEmails }, // Exclude specific emails
    }).select('fullName email state phoneNumber reportingManager'); // Select required fields

    res.status(200).json({
      success: true,
      data: usersWithoutAttendance,
    });
  } catch (error) {
    console.error('Error fetching users without attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users without attendance.',
    });
  }
};


const isFirstEntryToday = async (req, res) => {
  try {
    const userId = req.user._id; // Assuming you are using authentication middleware
    const todayDate = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

    // Check if there's an attendance record for the user on today's date
    const attendance = await Attendance.findOne({ user: userId, date: todayDate });

    if (attendance) {
      return res.status(200).json({ isFirstEntry: false }); // User has already marked attendance today
    } else {
      return res.status(200).json({ isFirstEntry: true }); // No attendance record found for today
    }
  } catch (error) {
    console.error('Error checking first entry:', error);
    res.status(500).json({ error: 'Failed to check entry status' });
  }
};


module.exports = { markAttendance, getAttendanceByDate, getAllAttendance, getFilteredAttendance, getEmailAttendance, getLocationName, getAttendanceWithDistances, getAttendanceSummary, saveTotalDistance, getUsersWithoutCheckIn, getUsersWithoutCheckOut, getUsersOnLeave, getUserVisitCounts, getUsersWithoutAttendance, isFirstEntryToday };