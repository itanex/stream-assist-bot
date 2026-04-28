# Database Restore Guide

This guide provides instructions on how to restore the database for the Stream Assist Bot project.

## Prerequisites

- Ensure you have access to the database backup file.
- Ensure you have the necessary permissions to restore the database.
- Install the required database management tools (e.g., MySQL, PostgreSQL).

## Steps to Restore the Database

1. **Stop the Application**
    - Ensure that the Stream Assist Bot application is stopped to prevent any data inconsistencies.

2. **Backup the Current Database**
    - Before restoring, create a backup of the current database in case you need to revert the changes.

    ```sh
    mysqldump -u [username] -p [database_name] > [backup_file].sql
    ```

3. **Drop the Existing Database**
    - Drop the existing database to prepare for the restore process.

    ```sql
    DROP DATABASE [database_name];
    CREATE DATABASE [database_name];
    ```

4. **Restore the Database from Backup**
    - Use the backup file to restore the database.

    ```sh
    mysql -u [username] -p [database_name] < [backup_file].sql
    ```

5. **Verify the Restore**
    - Check the database to ensure that the data has been restored correctly.

    ```sql
    USE [database_name];
    SHOW TABLES;
    ```

6. **Restart the Application**
    - Start the Stream Assist Bot application and verify that it is functioning correctly.

## Troubleshooting

- **Permission Issues**: Ensure that you have the correct permissions to perform the restore.
- **Backup File Issues**: Verify that the backup file is not corrupted and is in the correct format.
- **Database Connection Issues**: Ensure that the database server is running and accessible.

## Additional Resources

- [MySQL Documentation](https://dev.mysql.com/doc/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
