const pool = require('../config/database');

/**
 * Build paginated, searchable, sortable query
 * @param {object} options
 * @param {string} options.baseQuery - Base SELECT query without ORDER BY
 * @param {string} options.table - Main table name (for count query)
 * @param {string} options.tableAlias - Table alias used in baseQuery
 * @param {string[]} options.searchColumns - Columns to search in (use alias.column format)
 * @param {string[]} options.allowedSortColumns - Columns allowed for sorting
 * @param {string} options.defaultSort - Default ORDER BY clause
 * @param {object} req - Express request object (uses req.query)
 * @returns {Promise<{data: Array, total: number, page: number, totalPages: number, limit: number}>}
 */
const buildPaginatedQuery = async (options, req) => {
  const {
    baseQuery,
    table,
    tableAlias,
    searchColumns = [],
    allowedSortColumns = [],
    defaultSort = 'created_at DESC'
  } = options;

  const { search, sortBy, sortOrder = 'desc', page = 1, limit = 15 } = req.query;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  let whereClause = '';
  const params = [];

  // Search
  if (search && searchColumns.length > 0) {
    const searchConditions = searchColumns.map((col, i) => {
      params.push(`%${search}%`);
      return `CAST(${col} AS TEXT) ILIKE $${params.length}`;
    });
    whereClause = ` AND (${searchConditions.join(' OR ')})`;
  }

  // Sort
  let orderClause = defaultSort;
  if (sortBy && allowedSortColumns.includes(sortBy)) {
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const prefix = tableAlias ? `${tableAlias}.` : '';
    orderClause = `${prefix}${sortBy} ${order}`;
  }

  // Build the WHERE insertion point - check if baseQuery already has WHERE
  const hasWhere = baseQuery.toLowerCase().includes('where');
  let searchInjection = '';
  if (whereClause) {
    if (hasWhere) {
      searchInjection = whereClause;
    } else {
      searchInjection = ` WHERE 1=1${whereClause}`;
    }
  }

  // Inject search before ORDER BY if it exists in baseQuery, otherwise append
  let modifiedQuery = baseQuery;
  const orderByIdx = modifiedQuery.toLowerCase().lastIndexOf('order by');
  if (orderByIdx > -1) {
    modifiedQuery = modifiedQuery.substring(0, orderByIdx) + searchInjection + ` ORDER BY ${orderClause}`;
  } else {
    modifiedQuery = modifiedQuery + searchInjection + ` ORDER BY ${orderClause}`;
  }

  // Add pagination
  params.push(limitNum);
  const limitParam = `$${params.length}`;
  params.push(offset);
  const offsetParam = `$${params.length}`;
  modifiedQuery += ` LIMIT ${limitParam} OFFSET ${offsetParam}`;

  // Execute data query
  const dataResult = await pool.query(modifiedQuery, params);

  // Count query
  let countQuery;
  const countParams = [];
  if (search && searchColumns.length > 0) {
    const countSearchConditions = searchColumns.map((col) => {
      countParams.push(`%${search}%`);
      return `CAST(${col} AS TEXT) ILIKE $${countParams.length}`;
    });
    countQuery = `SELECT COUNT(*) FROM ${table} WHERE (${countSearchConditions.join(' OR ')})`;
  } else {
    countQuery = `SELECT COUNT(*) FROM ${table}`;
  }

  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].count);

  return {
    data: dataResult.rows,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
    limit: limitNum
  };
};

/**
 * Bulk delete records from a table
 */
const bulkDelete = async (table, ids, userId, entityType) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const result = await client.query(
      `DELETE FROM ${table} WHERE id IN (${placeholders}) RETURNING id`,
      ids
    );

    // Log each deletion
    for (const row of result.rows) {
      await client.query(
        'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
        ['BULK_DELETE', entityType, row.id, userId, JSON.stringify({ bulk: true }), '']
      );
    }

    await client.query('COMMIT');
    return result.rows.length;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Bulk update records in a table
 */
const bulkUpdate = async (table, ids, updates, userId, entityType) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      // Prevent SQL injection by only allowing safe column names
      if (/^[a-z_]+$/.test(key)) {
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      throw new Error('No valid update fields provided');
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

    const placeholders = ids.map((_, i) => `$${paramIndex + i}`).join(', ');
    values.push(...ids);

    const result = await client.query(
      `UPDATE ${table} SET ${setClauses.join(', ')} WHERE id IN (${placeholders}) RETURNING id`,
      values
    );

    for (const row of result.rows) {
      await client.query(
        'INSERT INTO audit_trail (action, entity_type, entity_id, user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
        ['BULK_UPDATE', entityType, row.id, userId, JSON.stringify({ updates, bulk: true }), '']
      );
    }

    await client.query('COMMIT');
    return result.rows.length;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { buildPaginatedQuery, bulkDelete, bulkUpdate };
