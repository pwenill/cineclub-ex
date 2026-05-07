import { RowDataPacket } from 'mysql2/promise';

import { getPool } from '../infra/mysql';

interface ArchiveCountRow extends RowDataPacket {
  nb: number | string | null;
}

export class SeanceArchiveService {
  async archiveOldSeances(beforeDate: string): Promise<number> {
    const connection = await getPool().getConnection();

    try {
      await connection.execute('CALL sp_archive_old_seances(?, @archive_count)', [beforeDate]);
      const [rows] = await connection.query<ArchiveCountRow[]>('SELECT @archive_count AS nb');
      return Number(rows[0]?.nb ?? 0);
    } finally {
      connection.release();
    }
  }
}
