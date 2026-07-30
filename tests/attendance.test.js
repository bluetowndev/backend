const mockTotalDistanceFind = jest.fn();
const mockTotalDistanceFindOne = jest.fn();

jest.mock('../models/distanceModel', () => ({
  find: mockTotalDistanceFind,
  findOne: mockTotalDistanceFindOne,
}));

jest.mock('sharp', () => {
  const fn = jest.fn().mockImplementation(() => ({
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('x')),
  }));
  return fn;
});

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn((_opts, cb) => {
        cb(null, { secure_url: 'https://c.com/x.jpg' });
        return { end: jest.fn() };
      }),
    },
  },
}));

const mockFindOne = jest.fn();
const mockFindById = jest.fn();

let mockAttendanceData = [];

const attendanceChain = {
  sort: jest.fn().mockReturnThis(),
  populate: jest.fn().mockReturnThis(),
  then(resolve) { resolve(mockAttendanceData); },
};

const mockAttendanceFind = jest.fn().mockReturnValue(attendanceChain);
const mockAttendanceAggregate = jest.fn();

jest.mock('../models/attendanceModel', () => {
  const m = jest.fn();
  m.findOne = mockFindOne;
  m.find = mockAttendanceFind;
  m.aggregate = mockAttendanceAggregate;
  m.distinct = jest.fn();
  return m;
});

const mockUserDistinct = jest.fn();
const mockUserFindOne = jest.fn();

let mockUserFindData = [];

const userChain = {
  distinct: mockUserDistinct,
  then(resolve) { resolve(mockUserFindData); },
};

const mockUserFind = jest.fn().mockReturnValue(userChain);

jest.mock('../models/userModel', () => ({
  findById: mockFindById,
  find: mockUserFind,
  distinct: mockUserDistinct,
  findOne: mockUserFindOne,
}));

const {
  markAttendance,
  getAttendanceByDate,
  getFilteredAttendance,
  getAttendanceWithDistances,
  getAttendanceSummary,
  getUserDashboardStats,
  getUserMovementTracking,
  getAdminDashboardStats,
} = require('../controllers/attendaceController');
const Attendance = require('../models/attendanceModel');

const mkRes = () => {
  const r = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json = jest.fn().mockReturnValue(r);
  return r;
};

const mkReq = (overrides = {}) => {
  const { body: bo, ...ro } = overrides;
  return {
    body: {
      location: JSON.stringify({ lat: 28.6139, lng: 77.209 }),
      image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      purpose: 'Check In',
      feedback: '',
      subPurpose: '',
      userId: undefined,
      ...(bo || {}),
    },
    user: { _id: 'u1', role: 'user' },
    ...ro,
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAttendanceData = [];
  mockUserFindData = [];
  mockFindOne.mockReset();
  mockFindById.mockReset();
  mockAttendanceAggregate.mockReset();
  mockUserDistinct.mockReset();
  mockUserFindOne.mockReset();
  mockTotalDistanceFind.mockReset();
  mockTotalDistanceFindOne.mockReset();
  mockUserDistinct.mockReset();
});

describe('getTodayIST', () => {
  const { getTodayIST } = require('../utils/istDate');

  it('returns YYYY-MM-DD format', () => {
    expect(getTodayIST()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('rolls date back at 3:00 AM IST boundary', () => {
    // June 2, 2:59 AM IST = June 1
    const jun2_0259_IST = new Date('2026-06-01T21:29:00Z');
    const r1 = getTodayIST(jun2_0259_IST);
    expect(r1).toBe('2026-06-01');

    // June 2, 3:00 AM IST = June 2
    const jun2_0300_IST = new Date('2026-06-01T21:30:00Z');
    const r2 = getTodayIST(jun2_0300_IST);
    expect(r2).toBe('2026-06-02');
  });
});

describe('getAttendanceSummary - guard validation', () => {
  const { getAttendanceSummary } = require('../controllers/attendaceController');

  const mkRes = () => {
    const r = {};
    r.status = jest.fn().mockReturnValue(r);
    r.json = jest.fn().mockReturnValue(r);
    return r;
  };

  const mkReq = (overrides = {}) => ({
    query: {},
    user: { _id: 'u1' },
    ...overrides,
  });

  it('rejects missing startDate with 400', async () => {
    const r = mkRes();
    await getAttendanceSummary(mkReq(), r);
    expect(r.status).toHaveBeenCalledWith(400);
  });

  it('rejects missing endDate with 400', async () => {
    const r = mkRes();
    await getAttendanceSummary(mkReq({ query: { startDate: '2026-06-01' } }), r);
    expect(r.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 when both dates are provided', async () => {
    mockAttendanceData = [];
    const r = mkRes();
    await getAttendanceSummary(mkReq({ query: { startDate: '2026-06-01', endDate: '2026-06-10' } }), r);
    expect(r.status).toHaveBeenCalledWith(200);
  });
});

describe('markAttendance', () => {

  describe('Input Validation', () => {
    it('missing image -> 400', async () => {
      const r = mkRes();
      await markAttendance(mkReq({ body: { image: undefined } }), r);
      expect(r.status).toHaveBeenCalledWith(400);
      expect(r.json).toHaveBeenCalledWith({ error: 'Image is required' });
    });

    it('missing location -> 400', async () => {
      const r = mkRes();
      await markAttendance(mkReq({ body: { location: undefined } }), r);
      expect(r.status).toHaveBeenCalledWith(400);
      expect(r.json).toHaveBeenCalledWith({ error: 'Location is required' });
    });

    it('missing purpose -> 400', async () => {
      const r = mkRes();
      await markAttendance(mkReq({ body: { purpose: undefined } }), r);
      expect(r.status).toHaveBeenCalledWith(400);
      expect(r.json).toHaveBeenCalledWith({ error: 'Purpose of visit is required' });
    });

    it('invalid image format -> 400', async () => {
      const r = mkRes();
      await markAttendance(mkReq({ body: { image: 'bad' } }), r);
      expect(r.status).toHaveBeenCalledWith(400);
      expect(r.json).toHaveBeenCalledWith({ error: 'Invalid image format' });
    });
  });

  describe('Duplicate Prevention', () => {
    it('duplicate Check In -> 409', async () => {
      mockFindOne.mockResolvedValue({ _id: 'e' });
      const r = mkRes();
      await markAttendance(mkReq(), r);
      expect(r.status).toHaveBeenCalledWith(409);
    });

    it('duplicate Check Out -> 409', async () => {
      mockFindOne.mockResolvedValue({ _id: 'e' });
      const r = mkRes();
      await markAttendance(mkReq({ body: { purpose: 'Check Out' } }), r);
      expect(r.status).toHaveBeenCalledWith(409);
    });

    it('duplicate On Leave -> 409', async () => {
      mockFindOne.mockResolvedValue({ _id: 'e' });
      const r = mkRes();
      await markAttendance(mkReq({ body: { purpose: 'On Leave' } }), r);
      expect(r.status).toHaveBeenCalledWith(409);
    });
  });

  describe('Check-Out Sequence Validation', () => {
    it('Check Out without Check In -> 400', async () => {
      mockFindOne.mockResolvedValue(null);
      const r = mkRes();
      await markAttendance(mkReq({ body: { purpose: 'Check Out' } }), r);
      expect(r.status).toHaveBeenCalledWith(400);
      expect(r.json).toHaveBeenCalledWith({ error: 'You must Check In before checking out' });
    });
  });
});

describe('getAttendanceByDate', () => {
  const mkRes = () => {
    const r = {};
    r.status = jest.fn().mockReturnValue(r);
    r.json = jest.fn().mockReturnValue(r);
    return r;
  };
  const mkReq = (overrides = {}) => ({ query: { date: '2026-06-15' }, user: { _id: 'u1' }, ...overrides });

  it('queries by date string (not timestamp)', async () => {
    mockAttendanceData = [{ _id: 'a1', date: '2026-06-15' }];
    const r = mkRes();
    await getAttendanceByDate(mkReq(), r);
    expect(mockAttendanceFind).toHaveBeenCalledWith({ user: 'u1', date: '2026-06-15' });
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it('returns empty array when no records', async () => {
    mockAttendanceData = [];
    const r = mkRes();
    await getAttendanceByDate(mkReq(), r);
    expect(r.json).toHaveBeenCalledWith([]);
  });

  it('uses the date from query param', async () => {
    mockAttendanceData = [];
    const r = mkRes();
    await getAttendanceByDate(mkReq({ query: { date: '2026-07-01' } }), r);
    expect(mockAttendanceFind).toHaveBeenCalledWith({ user: 'u1', date: '2026-07-01' });
  });
});

describe('getFilteredAttendance', () => {
  const mkRes = () => {
    const r = {};
    r.status = jest.fn().mockReturnValue(r);
    r.json = jest.fn().mockReturnValue(r);
    return r;
  };
  const mkReq = (overrides = {}) => ({ query: { state: 'all', startDate: '2026-06-01', endDate: '2026-06-10' }, user: { _id: 'u1' }, ...overrides });

  it('queries by date string range', async () => {
    mockUserDistinct.mockResolvedValue(['u1', 'u2']);
    mockAttendanceData = [];
    const r = mkRes();
    await getFilteredAttendance(mkReq(), r);
    expect(mockAttendanceFind).toHaveBeenCalledWith({
      user: { $in: ['u1', 'u2'] },
      date: { $gte: '2026-06-01', $lte: '2026-06-10' },
    });
  });

  it('falls back to startDate as endDate when endDate is missing', async () => {
    mockUserDistinct.mockResolvedValue(['u1']);
    mockAttendanceData = [];
    const r = mkRes();
    await getFilteredAttendance(mkReq({ query: { state: 'all', startDate: '2026-06-01' } }), r);
    expect(mockAttendanceFind).toHaveBeenCalledWith({
      user: { $in: ['u1'] },
      date: { $gte: '2026-06-01', $lte: '2026-06-01' },
    });
  });

  it('filters by specific state', async () => {
    mockUserDistinct.mockResolvedValue(['u2']);
    mockAttendanceData = [];
    const r = mkRes();
    await getFilteredAttendance(mkReq({ query: { state: 'Gujarat', startDate: '2026-06-01', endDate: '2026-06-10' } }), r);
    expect(mockUserFind).toHaveBeenCalledWith({ state: 'Gujarat' });
    expect(mockUserDistinct).toHaveBeenCalledWith('_id');
  });

  it('returns 200 on success', async () => {
    mockUserDistinct.mockResolvedValue(['u1']);
    mockAttendanceData = [{ _id: 'a1', date: '2026-06-01' }];
    const r = mkRes();
    await getFilteredAttendance(mkReq(), r);
    expect(r.status).toHaveBeenCalledWith(200);
  });
});

describe('getAttendanceWithDistances', () => {
  const mkRes = () => {
    const r = {};
    r.status = jest.fn().mockReturnValue(r);
    r.json = jest.fn().mockReturnValue(r);
    return r;
  };
  const mkReq = (overrides = {}) => ({ query: { date: '2026-06-15' }, user: { _id: 'u1' }, ...overrides });

  it('queries by date string (not timestamp range)', async () => {
    mockAttendanceData = [{ _id: 'a1', date: '2026-06-15', location: { lat: 28.6, lng: 77.2 } }];
    const r = mkRes();
    await getAttendanceWithDistances(mkReq(), r);
    expect(mockAttendanceFind).toHaveBeenCalledWith({ user: 'u1', date: '2026-06-15' });
  });

  it('returns 200 with single attendance (no distance calc)', async () => {
    mockAttendanceData = [{ _id: 'a1', date: '2026-06-15', location: { lat: 28.6, lng: 77.2 } }];
    const r = mkRes();
    await getAttendanceWithDistances(mkReq(), r);
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it('handles missing records', async () => {
    mockAttendanceData = [];
    const r = mkRes();
    await getAttendanceWithDistances(mkReq(), r);
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith([]);
  });
});

describe('getAttendanceSummary - business logic', () => {
  const mkRes = () => {
    const r = {};
    r.status = jest.fn().mockReturnValue(r);
    r.json = jest.fn().mockReturnValue(r);
    return r;
  };
  const mkReq = (overrides = {}) => ({ query: { startDate: '2026-06-01', endDate: '2026-06-10' }, user: { _id: 'u1' }, ...overrides });

  it('queries by date string range', async () => {
    mockAttendanceData = [];
    const r = mkRes();
    await getAttendanceSummary(mkReq(), r);
    expect(mockAttendanceFind).toHaveBeenCalledWith({
      user: 'u1',
      date: { $gte: '2026-06-01', $lte: '2026-06-10' },
    });
  });

  it('counts present days from returned records', async () => {
    mockAttendanceData = [
      { date: '2026-06-01' }, { date: '2026-06-01' },
      { date: '2026-06-02' }, { date: '2026-06-03' },
    ];
    const r = mkRes();
    await getAttendanceSummary(mkReq({ query: { startDate: '2026-06-01', endDate: '2026-06-05' } }), r);
    expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ present: 3 }));
  });

  it('excludes holidays from workDays', async () => {
    mockAttendanceData = [
      { date: '2026-06-01' }, { date: '2026-06-02' },
      { date: '2026-06-03' }, { date: '2026-06-04' },
    ];
    const r = mkRes();
    await getAttendanceSummary(mkReq({ query: { startDate: '2026-06-01', endDate: '2026-06-07', holidays: '2026-06-05,2026-06-06' } }), r);
    expect(r.json).toHaveBeenCalledWith(expect.objectContaining({
      present: 4,
      workDays: 5,
    }));
  });
});

describe('getUserDashboardStats', () => {
  const mkRes = () => {
    const r = {};
    r.status = jest.fn().mockReturnValue(r);
    r.json = jest.fn().mockReturnValue(r);
    return r;
  };
  const mkReq = () => ({ user: { _id: 'u1' } });

  const defaultMocks = () => {
    mockAttendanceData = [];
    mockTotalDistanceFind.mockResolvedValue([]);
    mockTotalDistanceFindOne.mockResolvedValue(null);
  };

  it('queries monthly attendance by date string range', async () => {
    defaultMocks();
    const r = mkRes();
    await getUserDashboardStats(mkReq(), r);
    const callArg = mockAttendanceFind.mock.calls[0][0];
    expect(callArg).toHaveProperty('date');
    expect(callArg.date).toHaveProperty('$gte');
    expect(callArg.date).toHaveProperty('$lte');
    expect(typeof callArg.date.$gte).toBe('string');
    expect(typeof callArg.date.$lte).toBe('string');
  });

  it('returns stats with 0 values when no data', async () => {
    defaultMocks();
    const r = mkRes();
    await getUserDashboardStats(mkReq(), r);
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(expect.objectContaining({
      attendanceRate: expect.any(String),
      averageCheckIn: expect.any(String),
    }));
  });

  it('queries previous month also by date string', async () => {
    defaultMocks();
    const r = mkRes();
    await getUserDashboardStats(mkReq(), r);
    expect(mockAttendanceFind).toHaveBeenCalledTimes(2);
    const secondCall = mockAttendanceFind.mock.calls[1][0];
    expect(secondCall).toHaveProperty('date');
  });
});

describe('getUserMovementTracking', () => {
  const mkRes = () => {
    const r = {};
    r.status = jest.fn().mockReturnValue(r);
    r.json = jest.fn().mockReturnValue(r);
    return r;
  };
  const mkReq = (overrides = {}) => ({ query: { userId: 'u1', startDate: '2026-06-01', endDate: '2026-06-05' }, ...overrides });

  it('queries by date string range', async () => {
    mockAttendanceData = [];
    const r = mkRes();
    await getUserMovementTracking(mkReq(), r);
    expect(mockAttendanceFind).toHaveBeenCalledWith(
      expect.objectContaining({ date: { $gte: '2026-06-01', $lte: '2026-06-05' } })
    );
  });

  it('uses today fallback when no dates provided', async () => {
    mockAttendanceData = [];
    const r = mkRes();
    await getUserMovementTracking(mkReq({ query: { userId: 'u1' } }), r);
    const callArg = mockAttendanceFind.mock.calls[0][0];
    expect(callArg.date.$gte).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(callArg.date.$lte).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('filters by email', async () => {
    mockUserFindOne.mockResolvedValue({ _id: 'u2', email: 'b@t.com' });
    mockAttendanceData = [];
    const r = mkRes();
    await getUserMovementTracking(mkReq({ query: { email: 'b@t.com', startDate: '2026-06-01', endDate: '2026-06-05' } }), r);
    expect(mockUserFindOne).toHaveBeenCalledWith({ email: 'b@t.com' });
  });

  it('returns 200 on success', async () => {
    mockAttendanceData = [];
    const r = mkRes();
    await getUserMovementTracking(mkReq(), r);
    expect(r.status).toHaveBeenCalledWith(200);
  });
});

describe('getAdminDashboardStats', () => {
  const mkRes = () => {
    const r = {};
    r.status = jest.fn().mockReturnValue(r);
    r.json = jest.fn().mockReturnValue(r);
    return r;
  };
  const mkReq = (overrides = {}) => ({ query: { startDate: '2026-06-01', endDate: '2026-06-30', state: 'all' }, ...overrides });

  it('queries attendance by date string range', async () => {
    mockUserFindData = [{ _id: 'u1', state: 'Gujarat' }];
    mockAttendanceData = [];
    mockTotalDistanceFind.mockResolvedValue([]);
    const r = mkRes();
    await getAdminDashboardStats(mkReq(), r);
    const queryArg = mockAttendanceFind.mock.calls[0][0];
    expect(queryArg).toHaveProperty('date');
    expect(queryArg.date).toEqual({ $gte: '2026-06-01', $lte: '2026-06-30' });
  });

  it('filters by state', async () => {
    mockUserFindData = [{ _id: 'u1', state: 'Gujarat' }];
    mockAttendanceData = [];
    mockTotalDistanceFind.mockResolvedValue([]);
    const r = mkRes();
    await getAdminDashboardStats(mkReq({ query: { state: 'Gujarat', startDate: '2026-06-01', endDate: '2026-06-30' } }), r);
    expect(mockUserFind).toHaveBeenCalledWith({ state: 'Gujarat' });
  });

  it('uses 30-day default range when no dates', async () => {
    mockUserFindData = [{ _id: 'u1', state: 'Gujarat' }];
    mockAttendanceData = [];
    mockTotalDistanceFind.mockResolvedValue([]);
    const r = mkRes();
    await getAdminDashboardStats(mkReq({ query: { state: 'all' } }), r);
    const queryArg = mockAttendanceFind.mock.calls[0][0];
    expect(queryArg.date.$gte).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(queryArg.date.$lte).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns overview stats', async () => {
    mockUserFindData = [{ _id: 'u1', state: 'Gujarat' }];
    mockAttendanceData = [{ _id: 'a1', user: { _id: 'u1', state: 'Gujarat', toString() { return 'u1'; } }, purpose: 'Check In', date: '2026-06-01' }];
    mockTotalDistanceFind.mockResolvedValue([]);
    const r = mkRes();
    await getAdminDashboardStats(mkReq(), r);
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      stats: expect.objectContaining({
        overview: expect.objectContaining({
          totalUsers: expect.any(Number),
          activeUsers: expect.any(Number),
        }),
      }),
    }));
  });
});
