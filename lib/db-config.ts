/**
 * Pool options understood by the MariaDB driver.
 *
 * Declared locally rather than imported from `mariadb`: the Prisma adapter pins its
 * own copy of the driver, and importing its `PoolConfig` would tie this file to that
 * exact version.
 */
export interface MariaDbPoolConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
  connectionLimit: number
}

export interface MariaDbConnection {
  /** Pool options handed over to the MariaDB driver. */
  poolConfig: MariaDbPoolConfig
  /** Database (schema) name, also required by the Prisma adapter for query generation. */
  database: string
}

/**
 * Parses a connection URL into MariaDB driver pool options.
 *
 * A single `DATABASE_URL` is shared between the Prisma CLI and the runtime adapter,
 * but they disagree on the URL scheme: Prisma requires `mysql://` while the MariaDB
 * driver only parses `mariadb://`. Parsing the URL here keeps one variable for both.
 */
export function parseDatabaseUrl(rawUrl: string | undefined = process.env.DATABASE_URL): MariaDbConnection {
  if (!rawUrl) {
    throw new Error(
      "DATABASE_URL is not set. Expected mysql://user:password@host:3306/database (see .env.example)."
    )
  }

  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error(
      "DATABASE_URL is not a valid URL. Expected mysql://user:password@host:3306/database."
    )
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ""))
  if (!database) {
    throw new Error(
      "DATABASE_URL is missing the database name. Expected mysql://user:password@host:3306/database."
    )
  }

  // Strip the brackets IPv6 hosts carry in URLs (`[::1]` -> `::1`).
  const host = decodeURIComponent(url.hostname).replace(/^\[|\]$/g, "")
  const connectionLimit = Number(url.searchParams.get("connection_limit") ?? 10)

  return {
    database,
    poolConfig: {
      host,
      port: url.port ? Number(url.port) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database,
      connectionLimit: Number.isFinite(connectionLimit) && connectionLimit > 0 ? connectionLimit : 10,
    },
  }
}
