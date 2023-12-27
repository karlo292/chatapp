const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const {
    createServer
} = require('http');
const {
    Server
} = require('socket.io');
const config = require('./config');
const userDB = require('./userDB');
const session = require('express-session');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    /* options */
});

app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
app.use(cookieParser());

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));

// Use session middleware
app.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000
    } // Set the session duration to 24 hours
}));


let chatMessages = [];
let lastMessageUser = null;
let lastMessagesCount = 0;

app.get('/home', (req, res) => {
    res.redirect('/');
});

app.get('/', (req, res) => {
    let isLoggedIn
    const existingUsers = userDB.readDatabase().users
    console.log(existingUsers)
    try {
        console.log(req.session.user.username)
        if (existingUsers.some(user => user.username === req.session.user.username)) {
            isLoggedIn = true
        } else {
            isLoggedIn = false
        }
    } catch (error) {
        isLoggedIn = false
    }
    console.log(isLoggedIn)
    res.render('index', {
        isLoggedIn: isLoggedIn,
    });
});

app.get('/gaming', (req, res) => {
    let isLoggedIn
    const existingUsers = userDB.readDatabase().users
    
    try {
        console.log(req.session.user.username)
        if (existingUsers.some(user => user.username === req.session.user.username)) {
            isLoggedIn = true
        } else {
            isLoggedIn = false
        }
    } catch (error) {
        isLoggedIn = false
    }
    console.log(isLoggedIn)
    res.render('index', {
        isLoggedIn:isLoggedIn,
    })

})


app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/register', (req, res) => {
    const {
        username,
        password,
        email
    } = req.body;

    try {
        const existingUsers = userDB.readDatabase().users;

        if (existingUsers.some(user => user.username === username)) {
            return res.status(400).send('Username already exists');
        }

        // Store the password in plain text (not recommended for production)
        const newUser = {
            username,
            password,
            email
        };
        existingUsers.push(newUser);
        userDB.writeDatabase({
            users: existingUsers
        });

        // Set user information in the session
        req.session.user = {
            username: username,
            password: password,
            email: email
        };

        // Now that we have access to the socket object, set the username
        handleSocketConnection(req.session.user.username);

        res.redirect('/');
    } catch (error) {
        console.error('Error accessing user database:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/login', (req, res) => {
    const {
        username,
        password
    } = req.body;
    try {
        const existingUsers = userDB.readDatabase().users;

        // Checks if username and password are correct, can also use email as username
        const user = existingUsers.find(user => (user.username === username || user.email === username) && user.password === password);

        if (user) {
            // Set user information in the session
            req.session.user = user;

            // Sets the username
            handleSocketConnection(req.session.user.username);

            console.log('Login successful');
            res.redirect('/');
        } else {
            console.log('Wrong username or password');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


io.on('connection', (socket) => {
socket.emit('chat history', chatMessages);

socket.on('chat message', (message) => {

    console.log(`Message from ${socket.username}: ${message}`);
    if (socket.username === lastMessageUser) {
        lastMessagesCount += 1;
        if (lastMessagesCount > 4) {
            lastMessagesCount = 0;
            chatMessages.push({
                username: socket.username,
                message
            });
            io.emit('chat message', {
                username: socket.username,
                message
            });
        } else {
            chatMessages.push({
                username: '',
                message
            });
            io.emit('chat message', {
                username: '',
                message
            });
        }
    } else {
        lastMessagesCount = 0;
        chatMessages.push({
            username: socket.username,
            message
        });
        io.emit('chat message', {
            username: socket.username,
            message
        });
        lastMessageUser = socket.username;
    }
});
})



// Gets username of user that's logged in
function handleSocketConnection(username) {
    io.on('connection', (socket) => {
        console.log('A user connected');
        socket.username = username;
    });
}


httpServer.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
});
