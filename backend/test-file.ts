// Hardcoded credentials
const aws_secret_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";

// SQL Injection risk (dynamic query string interpolation)
function getUserData(userId: string) {
    const query = `SELECT * FROM users WHERE id = '${userId}'`;
    return query;
}
