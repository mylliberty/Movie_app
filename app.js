const express = require("express");
const bodyParser = require("body-parser");
const session = require('express-session');
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const ejs = require('ejs');
const User = require('./models/User');
const Movie = require('./models/Movie');
const axios = require('axios');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(session({
    secret: '123',
    resave: false,
    saveUninitialized: true
}));
app.set('view engine', 'ejs');

const dbUrl = "mongodb+srv://dana:dana@cluster0.dfjnrfx.mongodb.net/MovieDB"; // Replace 'yourdbname' with your actual database name
const connectionParams = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
};

// Connect to MongoDB
mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("CONNECTED TO DATABASE SUCCESSFULLY");
    // Start the server after successfully connecting to the database
    app.listen(3000, () => {
      console.log('Server is running on port 3000');
    });
  })
  .catch((error) => {
    console.error('COULD NOT CONNECT TO DATABASE:', error.message);
  });
  

// Handle user registration
app.post("/register", async (req, res) => {
    try {
        const { username, password } = req.body;
        // Hash the password before storing it in the database
        const hashedPassword = await bcrypt.hash(password, 10);
        // Create a new user instance
        const newUser = new User({
            username: username,
            password: hashedPassword
        });
        // Save the user to the database
        await newUser.save();
        // Send a success message and redirect to the login page using JavaScript
        res.send("<script>alert('Successfully registered'); window.location.href = '/login';</script>");
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).send("An error occurred while registering the user");
    }
});


// Route to render the homepage
app.get("/", async function (req, res) {
    try {
        const movies = await Movie.find({ deletedAt: null }).sort({ createdAt: 'desc' }).exec();
        res.render("index", { userIsLoggedIn: req.session.user, movies });
    } catch (error) {
        console.error("Error fetching movies:", error);
        res.render("index", { userIsLoggedIn: req.session.user, movies: [] });
    }
});


app.get("/login", function (req, res) {
    res.render("login", { error: null });
});

app.post("/login", async function (req, res) {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });

        if (user && !user.deletedAt && (await bcrypt.compare(password, user.password))) {
            req.session.user = { username: user.username, isAdmin: user.isAdmin };

            if (user.isAdmin) {
                res.redirect("/admin");
            } else {
                res.redirect("/"); 
            }
        } else {
            res.render("login", { error: "Invalid username or password" });
        }
    } catch (error) {
        console.error("Error during login:", error);
        res.render("login", { error: "An error occurred. Please try again." });
    }
});


app.get("/register", function (req, res) {
    res.render("register", { error: null });
});

app.post("/register", async function (req, res) {
    const { username, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword});
        await newUser.save();

        res.redirect("/login");
    } catch (error) {
        console.error("Error during registration:", error);
        res.render("register", { error: "An error occurred. Please try again." });
    }
});

app.get("/admin", async function (req, res) {
    try {
        const users = await User.find({});
        const movies = await Movie.find().sort({ createdAt: 'desc' }).exec(); 
        res.render("admin", { users, movies });
    } catch (error) {
        console.error("Error fetching data:", error);
        res.send("An error occurred while fetching data.");
    }
});

app.get("/admin/add", function (req, res) {
    res.render("addUser");
});

app.post("/admin/add", async function (req, res) {
    const { username, password, isAdmin } = req.body;

    try {
        const isAdminValue = isAdmin === 'true';

        const newUser = new User({
            username,
            password: await bcrypt.hash(password, 10),
            isAdmin: isAdminValue,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        await newUser.save();

        res.redirect("/admin");
    } catch (error) {
        console.error("Error adding user:", error);
        res.send("An error occurred while adding user.");
    }
});

app.post("/admin/edit/:userId", async function (req, res) {
    const userId = req.params.userId;
    const { username, newPassword, isAdmin } = req.body;

    try {
        const updateObject = {
            username,
            updatedAt: Date.now(),
            isAdmin: isAdmin === 'true',
        };

        if (newPassword) {
            updateObject.password = await bcrypt.hash(newPassword, 10);
        }

        await User.findByIdAndUpdate(userId, updateObject);

        res.redirect("/admin");
    } catch (error) {
        console.error("Error updating user:", error);
        res.send("An error occurred while updating user.");
    }
});

app.get("/admin/edit/:userId", async function (req, res) {
    const userId = req.params.userId;

    try {
        const user = await User.findById(userId);
        res.render("editUser", { user });
    } catch (error) {
        console.error("Error fetching user for edit:", error);
        res.send("An error occurred while fetching user data for edit.");
    }
});

app.post("/admin/delete/:userId", async function (req, res) {
    const userId = req.params.userId;

    try {
        await User.findByIdAndUpdate(userId, { deletedAt: Date.now() });

        res.redirect("/admin");
    } catch (error) {
        console.error("Error deleting user:", error);
        res.send("An error occurred while deleting user.");
    }
});

app.get("/admin/add-movie", (req, res) => {
    res.render('add-movie.ejs'); 
});

app.post("/admin/add-movie", async (req, res) => {
    const { title, description, image1, image2, image3, trailer } = req.body;
    try {
        const newMovie = new Movie({ title, description, image1, image2, image3, trailer });
        await newMovie.save();
        res.redirect('/admin'); 
    } catch (error) {
        console.log(error);
        res.redirect('/admin/add-movie');
    }
});

app.get("/admin/edit-movie/:movieId", async (req, res) => {
    const movieId = req.params.movieId;
    try {
        const movie = await Movie.findById(movieId);
        res.render("edit-movie", { movie });
    } catch (error) {
        console.error("Error fetching movie for edit:", error);
        res.send("An error occurred while fetching movie data for edit.");
    }
});

app.post("/admin/edit-movie/:movieId", async (req, res) => {
    const movieId = req.params.movieId;
    const { title, description, image1, image2, image3, trailer } = req.body;

    try {
        await Movie.findByIdAndUpdate(movieId, {title, description, image1, image2, image3, trailer, updatedAt: Date.now(), });
        res.redirect("/admin");
    } catch (error) {
        console.error("Error updating movie:", error);
        res.send("An error occurred while updating movie.");
    }
});

app.post("/admin/delete-movie/:movieId", async function (req, res) {
    const movieId = req.params.movieId;

    try {
        await Movie.findByIdAndUpdate(movieId, {
            deletedAt: Date.now(), 
        });

        res.redirect("/admin");
    } catch (error) {
        console.error("Error deleting movie:", error);
        res.send("An error occurred while deleting the movie.");
    }
});

app.get("/movie", async (req, res) => {
  const movieTitle = req.query.title;
  
  if (!movieTitle) {
    console.log("No movie title provided. Redirecting to /");
    return res.redirect('/');
  }

  const omdbUrl = `https://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&t=${encodeURIComponent(movieTitle)}`;
  const youtubeSearchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(movieTitle)}+trailer&key=${process.env.YOUTUBE_API_KEY}`;

  try {
      const [movieResponse, trailerResponse] = await Promise.all([
          axios.get(omdbUrl),
          axios.get(youtubeSearchUrl)
      ]);

      const movieInfo = movieResponse.data;
      const trailerInfo = trailerResponse.data.items.length > 0 ? trailerResponse.data.items[0] : null;
      const trailerUrl = trailerInfo ? `https://www.youtube.com/embed/${trailerInfo.id.videoId}` : null;

      console.log("Movie information retrieved successfully");
       res.render('movie', { movieInfo, trailerUrl, isAdmin: req.session.user.isAdmin });
  }catch(error) {
        console.error("Error retrieving movie information:", error);
        res.redirect('/');
    }
});

app.get("/logout", function (req, res) {
    req.session.destroy();
    res.redirect("/");
});


app.get("/logout", function (req, res) {
    req.session.destroy();
    res.redirect("/");
});


app.get("/", function (req, res) {
    res.render("index");
});

 
const port = process.env.PORT || 8080; // Use the PORT environment variable if available, otherwise use port 3000

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});