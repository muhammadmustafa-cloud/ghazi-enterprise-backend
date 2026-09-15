import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

const money = (value) => `Rs ${Number(value || 0).toLocaleString('en-PK')}`;

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const redirectWith = (res, path, params = {}) => {
  const query = new URLSearchParams(params).toString();
  res.redirect(`${path}${query ? `?${query}` : ''}`);
};

const parseCookies = (cookieHeader = '') => Object.fromEntries(
  cookieHeader
    .split(';')
    .map((part) => part.trim().split('='))
    .filter(([key, value]) => key && value)
    .map(([key, value]) => [key, decodeURIComponent(value)])
);

const getDashboardUser = async (req) => {
  const token = parseCookies(req.headers.cookie).ghazi_admin_token;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await db.execute(
      'SELECT id, name, email, role FROM users WHERE id = ? AND role = ?',
      [decoded.id, 'admin']
    );
    return users[0] || null;
  } catch {
    return null;
  }
};

const requireAdmin = async (req, res, next) => {
  const user = await getDashboardUser(req);
  if (!user) return res.redirect('/admin/login');
  req.adminUser = user;
  next();
};

const setAdminCookie = (res, token) => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `ghazi_admin_token=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/admin; Max-Age=86400${secure}`
  );
};

const clearAdminCookie = (res) => {
  res.setHeader('Set-Cookie', 'ghazi_admin_token=; HttpOnly; SameSite=Lax; Path=/admin; Max-Age=0');
};

const navItem = (href, label, activePath) => `
  <a class="${activePath === href ? 'active' : ''}" href="${href}">
    <span>${label}</span>
  </a>
`;

const appShell = ({ title, activePath, user, message = '', error = '', body }) => `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(title)} | Ghazi Admin</title>
      <style>
        :root {
          --primary: #f97316;
          --primary-700: #c2410c;
          --ink: #111827;
          --navy: #0f172a;
          --muted: #667085;
          --line: #e6e8ef;
          --bg: #f5f7fb;
          --surface: #ffffff;
          --soft: #f8fafc;
          --danger: #dc2626;
          --success: #15803d;
          --focus: rgba(249, 115, 22, .18);
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: var(--bg);
          color: var(--ink);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        a { color: inherit; text-decoration: none; }
        .shell { display: grid; grid-template-columns: 272px minmax(0, 1fr); min-height: 100vh; }
        .sidebar {
          position: sticky;
          top: 0;
          height: 100vh;
          padding: 26px 18px;
          background: var(--navy);
          color: #fff;
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(255,255,255,.08);
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 10px 28px;
          border-bottom: 1px solid rgba(255,255,255,.1);
          margin-bottom: 20px;
        }
        .brand-mark {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: var(--primary);
          font-weight: 950;
          box-shadow: 0 14px 28px rgba(249,115,22,.24);
        }
        .brand-name { font-size: 22px; font-weight: 950; letter-spacing: -.02em; }
        .brand-subtitle { color: #94a3b8; font-size: 12px; font-weight: 800; margin-top: 2px; text-transform: uppercase; letter-spacing: .08em; }
        .nav-label { color: #94a3b8; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .12em; padding: 6px 12px 10px; }
        .nav { display: grid; gap: 6px; }
        .nav a {
          border-radius: 8px;
          color: #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 44px;
          padding: 11px 12px;
          font-size: 14px;
          font-weight: 850;
        }
        .nav a:hover { background: rgba(255,255,255,.08); color: #fff; }
        .nav a.active { background: #fff; color: var(--navy); box-shadow: 0 12px 34px rgba(0,0,0,.18); }
        .sidebar-footer {
          margin-top: auto;
          padding: 18px 10px 4px;
          border-top: 1px solid rgba(255,255,255,.1);
          color: #cbd5e1;
        }
        .avatar {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: rgba(249,115,22,.16);
          color: #fdba74;
          font-weight: 950;
          border: 1px solid rgba(249,115,22,.32);
        }
        .admin-user { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; }
        .admin-user strong { display: block; color: white; font-size: 14px; }
        .admin-user span { display: block; color: #94a3b8; font-size: 12px; margin-top: 2px; word-break: break-word; }
        .content { min-width: 0; padding: 28px; }
        .page-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 22px;
        }
        .eyebrow { color: var(--primary-700); font-size: 12px; font-weight: 950; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 7px; }
        h1 { margin: 0; font-size: 34px; line-height: 1.08; letter-spacing: -.035em; }
        h2 { margin: 0; font-size: 20px; letter-spacing: -.02em; }
        p { margin: 7px 0 0; color: var(--muted); line-height: 1.55; }
        .actions { display: flex; flex-wrap: wrap; gap: 10px; }
        .button, button {
          border: 0;
          border-radius: 8px;
          min-height: 42px;
          padding: 11px 15px;
          background: var(--primary);
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font: inherit;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 10px 20px rgba(249,115,22,.18);
        }
        .button:hover, button:hover { background: var(--primary-700); }
        .button.secondary { background: white; color: var(--ink); border: 1px solid var(--line); box-shadow: 0 8px 20px rgba(15,23,42,.04); }
        .button.secondary:hover { background: var(--soft); }
        .notice {
          border-radius: 8px;
          padding: 13px 15px;
          margin-bottom: 18px;
          font-size: 14px;
          font-weight: 850;
        }
        .notice.success { background: #ecfdf3; color: var(--success); border: 1px solid #bbf7d0; }
        .notice.error { background: #fff1f2; color: var(--danger); border: 1px solid #fecdd3; }
        .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 22px; }
        .stat-card, .panel {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 8px;
          box-shadow: 0 18px 42px rgba(15, 23, 42, .045);
        }
        .stat-card { padding: 18px; }
        .stat-top { color: var(--muted); font-size: 12px; font-weight: 950; text-transform: uppercase; letter-spacing: .08em; }
        .stat-value { margin-top: 12px; font-size: 32px; line-height: 1; font-weight: 950; letter-spacing: -.04em; }
        .stat-note { margin-top: 8px; color: var(--muted); font-size: 13px; font-weight: 700; }
        .panel { overflow: hidden; }
        .panel-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          padding: 18px 20px;
          border-bottom: 1px solid var(--line);
          background: linear-gradient(180deg, #fff, #fbfcfe);
        }
        .panel-body { padding: 20px; }
        .layout-two { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(340px, .75fr); gap: 18px; align-items: start; }
        .form-grid { display: grid; gap: 14px; }
        .form-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        label { display: grid; gap: 7px; color: #344054; font-size: 12px; font-weight: 950; text-transform: uppercase; letter-spacing: .055em; }
        input, select, textarea {
          width: 100%;
          border: 1px solid #d0d5dd;
          border-radius: 8px;
          background: white;
          color: var(--ink);
          font: inherit;
          font-size: 14px;
          padding: 11px 12px;
          outline: none;
        }
        textarea { min-height: 98px; resize: vertical; }
        input:focus, select:focus, textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 4px var(--focus); }
        .checkbox { display: flex; align-items: center; gap: 10px; text-transform: none; letter-spacing: 0; font-size: 14px; color: var(--ink); }
        .checkbox input { width: 18px; height: 18px; accent-color: var(--primary); }
        .hint { color: var(--muted); font-size: 12px; line-height: 1.45; text-transform: none; letter-spacing: 0; font-weight: 650; }
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th, td { padding: 14px 16px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: middle; }
        th { color: var(--muted); font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: .08em; background: #fbfcfe; }
        tbody tr:hover { background: #fff7ed; }
        .primary-text { font-weight: 900; color: var(--ink); }
        .secondary-text { color: var(--muted); font-size: 12px; margin-top: 3px; }
        .pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 5px 9px;
          background: #f1f5f9;
          color: #334155;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }
        .pill.admin { background: #fff7ed; color: #c2410c; }
        .pill.stock { background: #ecfdf3; color: #15803d; }
        .empty { padding: 34px; color: var(--muted); text-align: center; font-weight: 800; }
        @media (max-width: 1100px) {
          .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .layout-two { grid-template-columns: 1fr; }
        }
        @media (max-width: 820px) {
          .shell { grid-template-columns: 1fr; }
          .sidebar { position: relative; height: auto; }
          .content { padding: 20px; }
          .page-head { flex-direction: column; }
          .stats, .form-row { grid-template-columns: 1fr; }
        }
      </style>
    </head>
    <body>
      <div class="shell">
        <aside class="sidebar">
          <a class="brand" href="/admin/dashboard">
            <span class="brand-mark">G</span>
            <span>
              <span class="brand-name">GHAZI<span style="color:var(--primary)">.</span></span>
              <span class="brand-subtitle">Backend Admin</span>
            </span>
          </a>
          <div class="nav-label">Management</div>
          <nav class="nav">
            ${navItem('/admin/dashboard', 'Dashboard', activePath)}
            ${navItem('/admin/products', 'Products', activePath)}
            ${navItem('/admin/users', 'Users', activePath)}
            <a href="/api/products" target="_blank" rel="noreferrer"><span>Products API</span></a>
          </nav>
          <div class="sidebar-footer">
            <div class="admin-user">
              <div class="avatar">${escapeHtml(user?.name?.charAt(0).toUpperCase() || 'A')}</div>
              <div>
                <strong>${escapeHtml(user?.name || 'Admin')}</strong>
                <span>${escapeHtml(user?.email || '')}</span>
              </div>
            </div>
            <a class="button secondary" href="/admin/logout" style="width:100%">Sign Out</a>
          </div>
        </aside>
        <main class="content">
          ${message ? `<div class="notice success">${escapeHtml(message)}</div>` : ''}
          ${error ? `<div class="notice error">${escapeHtml(error)}</div>` : ''}
          ${body}
        </main>
      </div>
    </body>
  </html>
`;

const pageHeader = ({ eyebrow, title, description, actions = '' }) => `
  <header class="page-head">
    <div>
      <div class="eyebrow">${escapeHtml(eyebrow)}</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
    </div>
    ${actions ? `<div class="actions">${actions}</div>` : ''}
  </header>
`;

const statCard = (label, value, note) => `
  <article class="stat-card">
    <div class="stat-top">${escapeHtml(label)}</div>
    <div class="stat-value">${escapeHtml(value)}</div>
    <div class="stat-note">${escapeHtml(note)}</div>
  </article>
`;

const productRows = (products) => products.map((product) => `
  <tr>
    <td>
      <div class="primary-text">${escapeHtml(product.name)}</div>
      <div class="secondary-text">${escapeHtml(product.id)}</div>
    </td>
    <td>${escapeHtml(product.category_name || product.category_id)}</td>
    <td>${money(product.price)}</td>
    <td><span class="pill stock">${Number(product.stock || 0)} units</span></td>
    <td>${escapeHtml(product.condition_status || 'New')}</td>
  </tr>
`).join('');

const userRows = (users) => users.map((row) => `
  <tr>
    <td>
      <div class="primary-text">${escapeHtml(row.name)}</div>
      <div class="secondary-text">${escapeHtml(row.email)}</div>
    </td>
    <td><span class="pill ${row.role === 'admin' ? 'admin' : ''}">${escapeHtml(row.role)}</span></td>
    <td>${new Date(row.created_at).toLocaleDateString('en-PK')}</td>
  </tr>
`).join('');

const productForm = (categories) => {
  const categoryOptions = categories.map((category) => `
    <option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>
  `).join('');

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Add Product</h2>
          <p>Published products are saved in MySQL and shown on the public website through the products API.</p>
        </div>
      </div>
      <div class="panel-body">
        <form class="form-grid" method="post" action="/admin/products" enctype="multipart/form-data">
          <div class="form-row">
            <label>Product ID
              <input name="id" placeholder="nb-003" required />
            </label>
            <label>Category
              <select name="category" required>
                <option value="">Select category</option>
                ${categoryOptions}
              </select>
            </label>
          </div>
          <label>Product Name
            <input name="name" placeholder="Heavy Duty Moving Box" required />
          </label>
          <div class="form-row">
            <label>Base Price
              <input name="price" type="number" min="0" step="0.01" placeholder="150" required />
            </label>
            <label>Stock
              <input name="stock" type="number" min="0" step="1" placeholder="500" required />
            </label>
          </div>
          <div class="form-row">
            <label>Dimensions
              <input name="dimensions" placeholder="18x18x18 inch" />
            </label>
            <label>Ply / Strength
              <input name="ply" placeholder="3-ply" />
            </label>
          </div>
          <div class="form-row">
            <label>Material
              <input name="material" placeholder="Kraft Corrugated" />
            </label>
            <label>Condition
              <select name="condition">
                <option value="New">New</option>
                <option value="Used - Good">Used - Good</option>
                <option value="Used - Fair">Used - Fair</option>
              </select>
            </label>
          </div>
          <label>Description
            <textarea name="description" placeholder="Describe this product for customers."></textarea>
          </label>
          <label>Product Images (Upload)
            <input name="images" type="file" multiple accept="image/*" />
            <span class="hint">Select one or more images from your computer.</span>
          </label>
          <label>Bulk Pricing
            <textarea name="bulkPricing" placeholder="100:135&#10;500:120"></textarea>
            <span class="hint">One tier per line using min quantity and price.</span>
          </label>
          <label class="checkbox">
            <input name="customizable" type="checkbox" value="true" />
            Accept custom quote requests for this product
          </label>
          <button type="submit">Publish Product</button>
        </form>
      </div>
    </section>
  `;
};

const userForm = () => `
  <section class="panel">
    <div class="panel-head">
      <div>
        <h2>Create User</h2>
        <p>Create customer or admin accounts for the system.</p>
      </div>
    </div>
    <div class="panel-body">
      <form class="form-grid" method="post" action="/admin/users">
        <label>Name
          <input name="name" placeholder="Sales Manager" required />
        </label>
        <label>Email
          <input name="email" type="email" placeholder="user@example.com" required />
        </label>
        <label>Password
          <input name="password" type="password" minlength="6" required />
        </label>
        <label>Role
          <select name="role">
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button type="submit">Create User</button>
      </form>
    </div>
  </section>
`;

const loginPage = ({ error = '' } = {}) => `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Ghazi Admin Login</title>
      <style>
        :root { --primary:#f97316; --primary-700:#c2410c; --navy:#0f172a; --muted:#667085; --line:#e6e8ef; --danger:#dc2626; }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #111827;
        }
        .login-screen {
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: radial-gradient(circle at top left, rgba(249,115,22,.2), transparent 32%), var(--navy);
          padding: 20px;
        }
        .login-card { width: min(430px, 100%); background: white; border-radius: 8px; box-shadow: 0 30px 80px rgba(0,0,0,.32); overflow: hidden; }
        .login-accent { height: 7px; background: var(--primary); }
        form { padding: 34px; display: grid; gap: 15px; }
        h1 { margin: 0; font-size: 31px; letter-spacing: -.035em; }
        p { margin: 7px 0 12px; color: var(--muted); line-height: 1.5; }
        label { display: grid; gap: 7px; color: #344054; font-size: 12px; font-weight: 950; text-transform: uppercase; letter-spacing: .055em; }
        input { border: 1px solid #d0d5dd; border-radius: 8px; padding: 12px; font: inherit; outline: none; }
        input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(249,115,22,.18); }
        button { border: 0; border-radius: 8px; padding: 13px; background: var(--primary); color: white; font: inherit; font-weight: 900; cursor: pointer; }
        button:hover { background: var(--primary-700); }
        .error { background: #fff1f2; color: var(--danger); border: 1px solid #fecdd3; border-radius: 8px; padding: 12px; font-weight: 850; font-size: 14px; }
      </style>
    </head>
    <body>
      <main class="login-screen">
        <section class="login-card">
          <div class="login-accent"></div>
          <form method="post" action="/admin/login">
            <div>
              <h1>Ghazi Admin</h1>
              <p>Sign in to manage products, users, and backend operations.</p>
            </div>
            ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}
            <label>Email
              <input name="email" type="email" placeholder="admin@ghazienterprise.com" required />
            </label>
            <label>Password
              <input name="password" type="password" placeholder="admin123" required />
            </label>
            <button type="submit">Sign In</button>
          </form>
        </section>
      </main>
    </body>
  </html>
`;

const parseImageLines = (value = '') => value
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

const parseBulkPricingLines = (value = '') => value
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [minQty, price] = line.split(':').map((part) => part.trim());
    return { minQty: Number(minQty), price: Number(price) };
  })
  .filter((tier) => Number.isInteger(tier.minQty) && tier.minQty > 0 && Number.isFinite(tier.price) && tier.price >= 0);

const getProducts = async (limit = 200) => {
  const [products] = await db.query(`
    SELECT p.*, c.name AS category_name
    FROM products p
    JOIN categories c ON p.category_id = c.id
    ORDER BY p.created_at DESC
    LIMIT ?
  `, [limit]);
  return products;
};

const getCategories = async () => {
  const [categories] = await db.query('SELECT * FROM categories ORDER BY name ASC');
  return categories;
};

const getUsers = async (limit = 200) => {
  const [users] = await db.query(
    'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT ?',
    [limit]
  );
  return users;
};

const dashboardPage = ({ user, products, categories, users, message, error }) => appShell({
  title: 'Dashboard',
  activePath: '/admin/dashboard',
  user,
  message,
  error,
  body: `
    ${pageHeader({
      eyebrow: 'Overview',
      title: 'Backend Dashboard',
      description: 'A focused control center for catalog and user operations.',
      actions: `
        <a class="button secondary" href="http://localhost:5173" target="_blank" rel="noreferrer">Open Website</a>
        <a class="button" href="/admin/products">Add Product</a>
      `,
    })}
    <section class="stats">
      ${statCard('Products', String(products.length), 'Live catalog records')}
      ${statCard('Categories', String(categories.length), 'Available storefront groups')}
      ${statCard('Users', String(users.length), 'Admin and customer accounts')}
      ${statCard('Inventory', String(products.reduce((sum, item) => sum + Number(item.stock || 0), 0)), 'Total stock units')}
    </section>
    <section class="layout-two">
      <div class="panel">
        <div class="panel-head">
          <div>
            <h2>Recent Products</h2>
            <p>Latest catalog records coming from MySQL.</p>
          </div>
          <a class="button secondary" href="/admin/products">Manage</a>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Condition</th></tr></thead>
            <tbody>${productRows(products.slice(0, 8)) || '<tr><td colspan="5" class="empty">No products yet.</td></tr>'}</tbody>
          </table>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head">
          <div>
            <h2>Recent Users</h2>
            <p>Newest backend accounts.</p>
          </div>
          <a class="button secondary" href="/admin/users">Manage</a>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Role</th><th>Created</th></tr></thead>
            <tbody>${userRows(users.slice(0, 8)) || '<tr><td colspan="3" class="empty">No users yet.</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </section>
  `,
});

const productsPage = ({ user, products, categories, message, error }) => appShell({
  title: 'Products',
  activePath: '/admin/products',
  user,
  message,
  error,
  body: `
    ${pageHeader({
      eyebrow: 'Catalog',
      title: 'Products',
      description: 'Create products here. Every published product is served to the React storefront through /api/products.',
      actions: '<a class="button secondary" href="http://localhost:5173/shop/all" target="_blank" rel="noreferrer">View Storefront</a>',
    })}
    <section class="layout-two">
      ${productForm(categories)}
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Catalog List</h2>
            <p>${products.length} products in database.</p>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Condition</th></tr></thead>
            <tbody>${productRows(products) || '<tr><td colspan="5" class="empty">No products yet.</td></tr>'}</tbody>
          </table>
        </div>
      </section>
    </section>
  `,
});

const usersPage = ({ user, users, message, error }) => appShell({
  title: 'Users',
  activePath: '/admin/users',
  user,
  message,
  error,
  body: `
    ${pageHeader({
      eyebrow: 'Accounts',
      title: 'Users',
      description: 'Create customer and admin accounts separately from catalog management.',
      actions: '<a class="button secondary" href="/admin/dashboard">Back to Overview</a>',
    })}
    <section class="layout-two">
      ${userForm()}
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>User List</h2>
            <p>${users.length} users in database.</p>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Role</th><th>Created</th></tr></thead>
            <tbody>${userRows(users) || '<tr><td colspan="3" class="empty">No users yet.</td></tr>'}</tbody>
          </table>
        </div>
      </section>
    </section>
  `,
});

router.get('/', (req, res) => {
  res.redirect('/admin/dashboard');
});

router.get('/login', async (req, res) => {
  const user = await getDashboardUser(req);
  if (user) return res.redirect('/admin/dashboard');
  res.send(loginPage());
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await db.execute('SELECT * FROM users WHERE email = ? AND role = ?', [email, 'admin']);
    const user = users[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).send(loginPage({ error: 'Invalid admin credentials.' }));
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    setAdminCookie(res, token);
    res.redirect('/admin/dashboard');
  } catch (error) {
    res.status(500).send(loginPage({ error: error.message }));
  }
});

router.get('/logout', (req, res) => {
  clearAdminCookie(res);
  res.redirect('/admin/login');
});

router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const [products, categories, users] = await Promise.all([
      getProducts(50),
      getCategories(),
      getUsers(50),
    ]);

    res.send(dashboardPage({
      user: req.adminUser,
      products,
      categories,
      users,
      message: req.query.message,
      error: req.query.error,
    }));
  } catch (error) {
    res.status(500).send(appShell({
      title: 'Dashboard Error',
      activePath: '/admin/dashboard',
      user: req.adminUser,
      error: error.message,
      body: '<h1>Dashboard failed to load</h1>',
    }));
  }
});

router.get('/products', requireAdmin, async (req, res) => {
  try {
    const [products, categories] = await Promise.all([getProducts(), getCategories()]);
    res.send(productsPage({
      user: req.adminUser,
      products,
      categories,
      message: req.query.message,
      error: req.query.error,
    }));
  } catch (error) {
    redirectWith(res, '/admin/dashboard', { error: error.message });
  }
});

router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await getUsers();
    res.send(usersPage({
      user: req.adminUser,
      users,
      message: req.query.message,
      error: req.query.error,
    }));
  } catch (error) {
    redirectWith(res, '/admin/dashboard', { error: error.message });
  }
});

router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role = 'customer' } = req.body;
    if (!name || !email || !password) throw new Error('Name, email, and password are required.');
    if (!['customer', 'admin'].includes(role)) throw new Error('Invalid user role.');

    const passwordHash = await bcrypt.hash(password, 10);
    await db.execute(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), passwordHash, role]
    );

    redirectWith(res, '/admin/users', { message: 'User created successfully' });
  } catch (error) {
    redirectWith(res, '/admin/users', { error: error.message });
  }
});

router.post('/products', requireAdmin, upload.array('images', 5), async (req, res) => {
  const connection = await db.getConnection();

  try {
    const {
      id,
      name,
      category,
      price,
      dimensions = '',
      ply = '',
      material = '',
      condition = 'New',
      stock,
      description = '',
      customizable,
      bulkPricing = '',
    } = req.body;

    if (!id || !name || !category || price === undefined || stock === undefined) {
      throw new Error('Product ID, name, category, price, and stock are required.');
    }

    const productId = id.trim().toLowerCase();
    const numericPrice = Number(price);
    const numericStock = Number(stock);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) throw new Error('Product price must be a valid number.');
    if (!Number.isInteger(numericStock) || numericStock < 0) throw new Error('Stock must be a valid whole number.');

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrls = req.files ? req.files.map(file => `${baseUrl}/uploads/${file.filename}`) : [];
    const pricingTiers = parseBulkPricingLines(bulkPricing);

    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO products
        (id, category_id, name, price, dimensions, ply, material, condition_status, stock, description, customizable)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        category,
        name.trim(),
        numericPrice,
        dimensions.trim(),
        ply.trim(),
        material.trim(),
        condition,
        numericStock,
        description.trim(),
        customizable === 'true',
      ]
    );

    for (const imageUrl of imageUrls) {
      await connection.execute(
        'INSERT INTO product_images (product_id, image_url) VALUES (?, ?)',
        [productId, imageUrl]
      );
    }

    for (const tier of pricingTiers) {
      await connection.execute(
        'INSERT INTO bulk_pricing (product_id, min_qty, price) VALUES (?, ?, ?)',
        [productId, tier.minQty, tier.price]
      );
    }

    await connection.commit();
    redirectWith(res, '/admin/products', { message: 'Product published successfully' });
  } catch (error) {
    await connection.rollback();
    redirectWith(res, '/admin/products', { error: error.message });
  } finally {
    connection.release();
  }
});

export default router;
