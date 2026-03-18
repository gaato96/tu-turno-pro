require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

try {
    const prisma = new PrismaClient({});
    console.log("Success!");
} catch (e) {
    fs.writeFileSync("error_output.txt", e.message + "\n\n" + e.stack);
    console.log("Error written to error_output.txt");
}
