import sql from 'mssql';

class MSSQLPool {
  constructor(config) {
    if (!MSSQLPool.pool) {
      MSSQLPool.pool = new sql.ConnectionPool(config);
      MSSQLPool.poolConnect = MSSQLPool.pool.connect().catch(err => {
        console.error('数据库连接失败:', err);
      });
    }
  }

  async query(query, params = {}) {
    await MSSQLPool.poolConnect;
    const request = MSSQLPool.pool.request();
    for (const key in params) {
      request.input(key, params[key]);
    }
    return request.query(query);
  }

  async select(query, params = {}) {
    try{
      const result = await this.query(query, params);
      return result.recordset;
    }catch (e){
      console.log(params)
      console.log(e)
      return []
    }

  }

  async add(table, data) {
    const keys = Object.keys(data).map(k => `[${k}]`).join(',');
    const values = Object.keys(data).map(k => `@${k}`).join(',');
    const query = `INSERT INTO ${table} (${keys})
                   VALUES (${values})`;
    const result = await this.query(query, data);
    return result.rowsAffected[0];
  }

  async update(table, data, where) {
    const setStr = Object.keys(data).map(k => `[${k}]=@${k}`).join(',');
    const whereStr = Object.keys(where).map(k => `[${k}]=@w_${k}`).join(' AND ');
    const params = {...data};
    for (const key in where) params[`w_${key}`] = where[key];
    const query = `UPDATE ${table}
                   SET ${setStr}
                   WHERE ${whereStr}`;
    const result = await this.query(query, params);
    return result.rowsAffected[0];
  }

  async delete(table, where) {
    const whereStr = Object.keys(where).map(k => `[${k}]=@${k}`).join(' AND ');
    const result = await this.query(`DELETE
                                     FROM ${table}
                                     WHERE ${whereStr}`, where);
    return result.rowsAffected[0];
  }

  close() {
    return this.pool.close();
  }

}


export default MSSQLPool;