const {DB, Role} = require('../database/database.js');
const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
const adminUser = { name: "pizza admin", email: 'admin@admin.com', password: 'a', roles: [{ role: Role.Admin }]};

let testUserAuthToken;
let adminUserAuthToken;
let franchiseId;
let storeId;

const testOrder = {
  'franchiseId': 1,
  'storeId': 1,
  'items': [{
      'menuId': 1,
      'description': 'Veggie',
      'price': 0.05,
  }],
};
const testStore = {
  'franchiseId': franchiseId,
  'name': 'NYC'
};
const testFranchise = {
  'name': "franchisee's pizza!",
  'admins': [{'email': adminUser.email}],
};


beforeAll(async () => {
  testUser.email = randomStr() + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);

  adminUser.email = randomStr() + '@admin.com';
  let admin = await DB.addUser(adminUser);
  admin.password = adminUser.password;
  const adminLoginRes = await request(app).put('/api/auth').send(admin);
  adminUserAuthToken = adminLoginRes.body.token;
  expectValidJwt(adminUserAuthToken);
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test('find user', async () => {
  const userRes = await request(app)
  .get('/api/user/me')
  .set('Authorization', 'Bearer ' + testUserAuthToken);
  
  expect(userRes.status).toBe(200);
});

test('logout', async () => {
  const logoutRes = await request(app)
  .delete('/api/auth')
  .set('Authorization', 'Bearer ' + testUserAuthToken);

  expect(logoutRes.body.message).toBe('logout successful');
});

test('generate order', async () => {
  const orderRes = await request(app)
  .post('/api/order')
  .set('Authorization', 'Bearer ' + adminUserAuthToken)
  .send(testOrder);

  expect(orderRes.status).toBe(200);
});

test('find order', async () => {
  const orderRes = await request(app)
  .get('/api/order')
  .set('Authorization', 'Bearer ' + adminUserAuthToken);

  expect(orderRes.status).toBe(200);
});

test('generate franchise', async () => {
  testFranchise.name = randomStr() + "'s pizza!";
  testFranchise.admins = [{ 'email': adminUser.email }];

  const franchiseRes = await request(app)
  .post('/api/franchise')
  .set('Authorization', 'Bearer ' + adminUserAuthToken)
  .send(testFranchise);

  franchiseId = franchiseRes.body.id;
  expect(franchiseRes.status).toBe(200);
});


test('generate store', async () => {
  testStore.franchiseId = franchiseId;

  const storeRes = await request(app)
  .post('/api/franchise/' + franchiseId + '/store')
  .set('Authorization', 'Bearer ' + adminUserAuthToken)
  .send(testStore);

  storeId = storeRes.body.id;
  expect(storeRes.status).toBe(200);
});

test('delete store', async () => {
  const storeRes = await request(app)
  .delete('/api/franchise/' + franchiseId + '/store/' + storeId)
  .set('Authorization', 'Bearer ' + adminUserAuthToken);

  expect(storeRes.status).toBe(200);
});

test('get francises', async () => {
  const franchiseRes = await request(app)
  .get('/api/franchise?page=0&limit=5&name=*');

  expect(franchiseRes.status).toBe(200);
});

test('get admin franchises', async () => {
  const franchiseRes = await request(app)
  .get('/api/franchise/' + testUser.id)
  .set('Authorization', 'Bearer ' + adminUserAuthToken);

  expect(franchiseRes.status).toBe(200);
});

test('delete franchise', async () => {
  const franchiseRes = await request(app)
  .delete("/api/franchise/" + franchiseId)
  .set('Authorization', 'Bearer ' + adminUserAuthToken);

  expect(franchiseRes.status).toBe(200);
});

test('illegal api', async () => {
  const illegalRes = await request(app).post('/wowowowow');
  expect(illegalRes.status).toBe(404);
});

function randomStr() {
  return Math.random().toString(36).substring(2, 12)
}

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}