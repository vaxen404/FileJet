import 'dotenv/config'
import pg from 'pg'

const username = process.argv[2]
if (!username || process.argv.length !== 3) {
    console.error('Usage: npm run admin:promote -- <existing-username>')
    process.exitCode = 1
} else {
    const db = new pg.Client({ connectionString: process.env.DATABASE_URL })
    try {
        await db.connect()
        const result = await db.query('UPDATE users SET role = $1 WHERE username = $2 RETURNING username', ['ADMIN', username])
        if (!result.rowCount) throw new Error('No account has that username.')
        console.log(`Administrator role assigned to ${result.rows[0].username}. Refresh FileJet to open Admin.`)
    } catch (error) {
        console.error(error.message)
        process.exitCode = 1
    } finally { await db.end() }
}
