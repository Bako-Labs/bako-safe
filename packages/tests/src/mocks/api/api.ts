import axios from 'axios';
import { Server } from 'jest-axios';

const server = new Server({
  api: {
    'get /api/user/:id': (req) => {
      if (req.params.id === '123') {
        return { status: 200, data: { id: '123', name: 'Admin User' } };
      } else {
        return { status: 404, data: { error: 'User not found' } };
      }
    },
  },
});

beforeAll(() => server.init(axios));
afterAll(() => server.close());

describe('API tests with jest-axios', () => {
  it('should return user data for valid user ID', async () => {
    const response = await axios.get('/api/user/123');
    expect(response.data.name).toBe('Admin User');
  });

  it('should return 404 for invalid user ID', async () => {
    try {
      await axios.get('/api/user/999');
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  });
});
