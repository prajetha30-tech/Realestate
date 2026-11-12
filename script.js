// Switch between website pages

function showPage(page) {

    document.querySelectorAll(".page").forEach(section => {
        section.classList.add("hidden");
    });

    document.getElementById(page).classList.remove("hidden");

    if (page === "dashboard") {
        loadDashboard();
    }
}


// Check login status when website opens

async function checkLogin() {

    try {

        const response = await fetch("/api/me");

        if (response.ok) {
            showPage("dashboard");
        } else {
            showPage("home");
        }

    } catch (error) {

        showPage("home");

    }
}


// Registration

document.getElementById("registerForm")
.addEventListener("submit", async function(event) {

    event.preventDefault();

    const data = {
        name: document.getElementById("regName").value,
        email: document.getElementById("regEmail").value,
        phone: document.getElementById("regPhone").value,
        password: document.getElementById("regPassword").value
    };

    try {

        const response = await fetch("/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {

            alert("Registration successful!");

            document.getElementById("registerForm").reset();

            showPage("dashboard");

        } else {

            document.getElementById("registerMessage")
                .textContent = result.message;

        }

    } catch (error) {

        alert("Server connection failed.");

    }

});


// Login

document.getElementById("loginForm")
.addEventListener("submit", async function(event) {

    event.preventDefault();

    const data = {
        email: document.getElementById("loginEmail").value,
        password: document.getElementById("loginPassword").value
    };

    try {

        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {

            alert("Login successful!");

            document.getElementById("loginForm").reset();

            showPage("dashboard");

        } else {

            document.getElementById("loginMessage")
                .textContent = result.message;

        }

    } catch (error) {

        alert("Server connection failed.");

    }

});


// Load dashboard

async function loadDashboard() {

    try {

        const response = await fetch("/api/me");

        if (!response.ok) {
            showPage("login");
            return;
        }

        const user = await response.json();

        document.getElementById("welcome").textContent =
            "Welcome, " + user.name;

        searchProperties();

    } catch (error) {

        showPage("home");

    }

}


// Search properties

async function searchProperties() {

    const search = document.getElementById("searchInput").value;

    const list = document.getElementById("propertyList");

    const message = document.getElementById("propertyMessage");

    list.innerHTML = "";

    message.textContent = "Loading properties...";

    try {

        const response = await fetch(
            "/api/properties?search=" + encodeURIComponent(search)
        );

        if (response.status === 401) {
            showPage("login");
            return;
        }

        if (!response.ok) {
            throw new Error("Property loading failed");
        }

        const properties = await response.json();

        message.textContent = properties.length
            ? properties.length + " properties found"
            : "No properties found.";

        properties.forEach(property => {

            const card = document.createElement("div");

            card.className = "property-card";

            const image = document.createElement("img");

            image.src = property.image;

            image.alt = property.title;

            image.onerror = function() {
                image.style.display = "none";
            };

            const info = document.createElement("div");

            info.className = "property-info";

            const title = document.createElement("h3");
            title.textContent = property.title;

            const location = document.createElement("p");
            location.textContent = "Location: " + property.location;

            const bedrooms = document.createElement("p");
            bedrooms.textContent = "Bedrooms: " + property.bedrooms;

            const price = document.createElement("p");
            price.className = "price";

            price.textContent = new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0
            }).format(property.price);

            info.append(title, location, bedrooms, price);

            card.append(image, info);

            list.appendChild(card);

        });

    } catch (error) {

        message.textContent = "Unable to load properties.";

        console.error(error);

    }

}


// Logout

async function logout() {

    try {

        const response = await fetch("/logout", {
            method: "POST"
        });

        if (response.ok) {
            showPage("home");
            alert("Logged out successfully!");
        }

    } catch (error) {

        alert("Logout failed.");

    }

}


// Start website

checkLogin();