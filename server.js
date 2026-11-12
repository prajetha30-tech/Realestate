// Import packages

const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const session = require("express-session");

const app = express();

dotenv.config();

const PORT = process.env.PORT || 3000;


// Middleware

app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 1000
    }
}));


// Serve the three frontend files

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.get("/style.css", (req, res) => {
    res.sendFile(__dirname + "/style.css");
});

app.get("/script.js", (req, res) => {
    res.sendFile(__dirname + "/script.js");
});


// User database model

const userSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    phone: String,

    password: {
        type: String,
        required: true
    }

}, { timestamps: true });

const User = mongoose.model("User", userSchema);


// Property database model

const propertySchema = new mongoose.Schema({

    title: String,
    location: String,
    price: Number,
    bedrooms: Number,
    image: String

}, { timestamps: true });

const Property = mongoose.model("Property", propertySchema);


// Check login

function requireLogin(req, res, next) {

    if (!req.session.userId) {

        return res.status(401).json({
            message: "Please login first."
        });

    }

    next();
}


// Registration API

app.post("/register", async (req, res) => {

    try {

        const { name, email, phone, password } = req.body;

        if (!name || !email || !password) {

            return res.status(400).json({
                message: "Please fill all required fields."
            });

        }

        if (password.length < 6) {

            return res.status(400).json({
                message: "Password must be at least 6 characters."
            });

        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {

            return res.status(409).json({
                message: "Email already exists. Please login."
            });

        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({

            name: name.trim(),
            email: normalizedEmail,
            phone: phone || "",
            password: hashedPassword

        });

        req.session.regenerate((error) => {

            if (error) {
                return res.status(500).json({
                    message: "Session creation failed."
                });
            }

            req.session.userId = user._id.toString();

            req.session.save((error) => {

                if (error) {
                    return res.status(500).json({
                        message: "Could not start your session."
                    });
                }

                res.json({
                    message: "Registration successful!"
                });

            });

        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Registration failed."
        });

    }

});


// Login API

app.post("/login", async (req, res) => {

    try {

        const { email, password } = req.body;

        const user = await User.findOne({
            email: (email || "").trim().toLowerCase()
        });

        if (!user) {

            return res.status(401).json({
                message: "Invalid email or password."
            });

        }

        const validPassword = await bcrypt.compare(
            password || "",
            user.password
        );

        if (!validPassword) {

            return res.status(401).json({
                message: "Invalid email or password."
            });

        }

        req.session.regenerate((error) => {

            if (error) {
                return res.status(500).json({
                    message: "Session creation failed."
                });
            }

            req.session.userId = user._id.toString();

            req.session.save((error) => {

                if (error) {
                    return res.status(500).json({
                        message: "Could not start your session."
                    });
                }

                res.json({
                    message: "Login successful!"
                });

            });

        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Login failed."
        });

    }

});


// Get logged-in user

app.get("/api/me", requireLogin, async (req, res) => {

    try {

        const user = await User.findById(
            req.session.userId
        ).select("name email phone");

        if (!user) {

            return res.status(401).json({
                message: "User not found."
            });

        }

        res.json(user);

    } catch (error) {

        res.status(500).json({
            message: "Unable to fetch user."
        });

    }

});


// Search properties

app.get("/api/properties", requireLogin, async (req, res) => {

    try {

        const search = (req.query.search || "").trim();

        const filter = search ? {

            $or: [

                {
                    title: {
                        $regex: search,
                        $options: "i"
                    }
                },

                {
                    location: {
                        $regex: search,
                        $options: "i"
                    }
                }

            ]

        } : {};

        const properties = await Property.find(filter);

        res.json(properties);

    } catch (error) {

        res.status(500).json({
            message: "Unable to fetch properties."
        });

    }

});


// Logout API

app.post("/logout", requireLogin, (req, res) => {

    req.session.destroy((error) => {

        if (error) {
            return res.status(500).json({
                message: "Logout failed."
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            message: "Logout successful!"
        });

    });

});


// Insert sample properties

async function addProperties() {

    const count = await Property.countDocuments();

    if (count > 0) {
        return;
    }

    await Property.insertMany([

        {
            title: "Luxury Villa",
            location: "Bangalore",
            price: 8500000,
            bedrooms: 4,
            image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=900"
        },

        {
            title: "Modern Apartment",
            location: "Mysore",
            price: 5200000,
            bedrooms: 3,
            image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900"
        },

        {
            title: "Family House",
            location: "Mangalore",
            price: 6800000,
            bedrooms: 3,
            image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900"
        }

    ]);

    console.log("Sample properties added!");

}


// Connect MongoDB

async function startServer() {

    try {

        if (!process.env.MONGODB_URI ||
            !process.env.SESSION_SECRET) {

            throw new Error(
                "Please configure your .env file."
            );

        }

        await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB Connected Successfully!");

        await addProperties();

        app.listen(PORT, () => {

            console.log(
                `DASHATHA ESTATErunning at http://localhost:${PORT}`
            );

        });

    } catch (error) {

        console.log("Database connection error:", error.message);

        process.exit(1);

    }

}

startServer();