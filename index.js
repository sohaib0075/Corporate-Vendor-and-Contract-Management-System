const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 8080;

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'datascience',
    database: 'vendormanagementsystem'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to the MySQL database.');
});

// Middleware
app.use(bodyParser.json()); // Parse JSON request bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded forms
app.use(express.static('public')); // Serve static files




// home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/home.html'));
});


// Vendor Registeration page
app.get('/vendor-register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/vendor-register.html'));
});

// Vendor Registration Form
app.post('/register-vendor', (req, res) => {
    const { vendorname, contactinfo, servicecategory, certifications } = req.body;

    if (!vendorname || !contactinfo || !servicecategory || !certifications) {
        return res.status(400).send('All fields are mandatory.');
    }

    const query = `
        insert into vendor (vendorname, contactinfo, servicecategory, certifications)
        values (?, ?, ?, ?)
    `;

    db.query(query, [vendorname, contactinfo, servicecategory, certifications], (err, result) => {
        if (err) {
            console.error('Error registering vendor:', err);
            return res.status(500).send('Error registering vendor.');
        }
        console.log('Vendor registered successfully.');
        res.redirect('/signup');
    });
});


// Signup page
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/signup.html'));
});

// Handle signup form
app.post('/signup', (req, res) => {
    const { username, email, password } = req.body;

    const defaultRole = 'vendor';

    const query = `insert into userinfo (username, email, userrole, userpassword) values (?, ?, ?, ?)`;
    db.query(query, [username, email, defaultRole, password], (err, result) => {
        if (err) {
            console.error('Error registering user:', err);
            return res.status(500).send('Error registering user.');
        }
        console.log('User registered successfully.');
        res.redirect('/login'); // Redirect to login page after registration
    });
});



// Login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/login.html'));
});

// Login check
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const query = `select username, userrole from userinfo where username = ? and userpassword = ?`;

    db.query(query, [username, password], (err, results) => {
        if (err) {
            console.error('Error logging in:', err);
            res.status(500).send('Error logging in.');
            return;
        }

        if (results.length > 0) {
            const { username, userrole } = results[0];
            if (userrole === 'admin') {
                res.redirect('/admin-menu');
            } 
            else if (userrole === 'vendor') {
                res.redirect('/vendor-menu');
            }
            else if (userrole === 'financemanager') {
                res.redirect('/finance-menu');
            }
            else if (userrole === 'departmenthead') {
                res.redirect('/department-menu');
            }  
        } 
        else {
            res.status(401).send('Invalid username or password.');
        }
    });
});


// Admin menu page
app.get('/admin-menu', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin-menu.html'));
});

// Vendor menu page
app.get('/vendor-menu', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/vendor-menu.html'));
});

app.get('/finance-menu', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/finance-menu.html'));
});

app.get('/department-menu', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/department-menu.html'));
});


// Vendor data
app.get('/vendors', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/vendor-management.html'));
});

// API to Fetch Vendor Data
app.get('/api/vendors', (req, res) => {
    const query = `
        select 
            v.vendorid, 
            v.vendorname, 
            v.contactinfo, 
            v.servicecategory, 
            v.certifications,
            coalesce(AVG(p.rating), 'No Rating') as average_rating
        from vendor v
        left join performance p on v.vendorid = p.vendorid
        group by v.vendorid, v.vendorname, v.contactinfo, v.servicecategory, v.certifications
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching vendors with average ratings:', err);
            return res.status(500).send('Error fetching vendors.');
        }
        res.json(results);
    });
});



// Contract page
app.get('/create-contract', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/create-contract.html'));
});

// Contract form filling
app.post('/create-contract', (req, res) => {
    const { vendorid, contractterms, startdate, enddate } = req.body;

    const query = `
        insert into contract (vendorid, contractterms, startdate, enddate)
        values (?, ?, ?, ?)
    `;

    db.query(query, [vendorid, contractterms, startdate, enddate], (err, result) => {
        if (err) {
            console.error('Error creating contract:', err);
            return res.status(500).send('Error creating contract.');
        }
        console.log('Contract created successfully.');
        res.redirect('/vendor-menu');
    });
});


// Contract data page
app.get('/manage-contracts', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/manage-contracts.html'));
});

// All Contracts
app.get('/api/contracts', (req, res) => {
    const query = `select * from contract`;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching contracts:', err);
            return res.status(500).send('Error fetching contracts.');
        }
        res.json(results);
    });
});

// Users data
app.get('/api/users', (req, res) => {
    const query = `select * from userinfo`;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
            return res.status(500).send('Error fetching users.');
        }
        console.log('Fetched Users:', results); 
        res.json(results);
    });
});

// Update the user roles
app.post('/api/update-user-role', (req, res) => {
    const { userid, newRole } = req.body;

    console.log('Received request body:', req.body);

    if (!userid || !newRole) {
        console.error('Invalid request: Missing userid or newRole.');
        return res.status(400).send('Invalid request: Missing userid or newRole.');
    }

    const query = `update userinfo set userrole = ? WHERE userid = ?`;
    db.query(query, [newRole, userid], (err, result) => {
        if (err) {
            console.error('Error updating user role:', err);
            return res.status(500).send('Error updating user role.');
        }
        console.log(`User role updated for User ID: ${userid}`);
        res.send('User role updated successfully.');
    });
});

app.get('/vendor-performance', (req, res) => {
    const { vendorid } = req.query; // Extract vendorid from query string

    if (!vendorid) {
        return res.status(400).send('Vendor ID is required.');
    }

    // Retrieve any necessary data about the vendor if needed
    res.sendFile(path.join(__dirname, 'public/vendor-performance.html'));
});


app.post('/api/vendor-performance', (req, res) => {
    const { vendorid, rating, feedback } = req.body;

    if (!vendorid || !rating || rating < 1 || rating > 5) {
        return res.status(400).send('Invalid input: Vendor ID and rating (1-5) are required.');
    }

    const score = rating * 10;
    const query = `insert into performance (vendorid, rating, feedback)
                   values (?, ?, ?)
                   on duplicate key update rating = ?, feedback = ?`;

    db.query(query, [vendorid, rating, feedback, rating, feedback], (err, result) => {
        if (err) {
            console.error('Error inserting vendor performance:', err);
            return res.status(500).send('Error inserting vendor performance.');
        }
        console.log(`Performance added/updated for Vendor ID: ${vendorid}`);
        res.send(`Performance successfully updated. Calculated score: ${score}`);
    });
});



// API to add a new department
app.post('/api/add-department', (req, res) => {
    const { departmentname, managername, contactinfo } = req.body;

    if (!departmentname || !managername || !contactinfo) {
        return res.status(400).send('All fields are required.');
    }

    const query = `insert into department (departmentname, managername, contactinfo) values (?, ?, ?)`;
    db.query(query, [departmentname, managername, contactinfo], (err, result) => {
        if (err) {
            console.error('Error adding department:', err);
            return res.status(500).send('Error adding department.');
        }
        res.send('Department added successfully.');
    });
});


// API to delete a department
app.delete('/api/delete-department/:departmentid', (req, res) => {
    const { departmentid } = req.params;

    if (!departmentid) {
        return res.status(400).send('Department ID is required.');
    }

    const query = `delete from department where departmentid = ?`;
    db.query(query, [departmentid], (err, result) => {
        if (err) {
            console.error('Error deleting department:', err);
            return res.status(500).send('Error deleting department.');
        }
        res.send('Department deleted successfully.');
    });
});

// API to fetch all departments
app.get('/api/departments', (req, res) => {
    const query = `select * from department`;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching departments:', err);
            return res.status(500).send('Error fetching departments.');
        }
        res.json(results);
    });
});


// API to add a new budget
app.post('/api/add-budget', (req, res) => {
    const { departmentid, allocatedamount } = req.body;

    if (!departmentid || !allocatedamount) {
        return res.status(400).send('Department ID and allocated amount are required.');
    }

    const query = `
        insert into budget (departmentid, allocatedamount) 
        values (?, ?)
    `;
    db.query(query, [departmentid, allocatedamount], (err, result) => {
        if (err) {
            console.error('Error adding budget:', err);
            return res.status(500).send('Error adding budget.');
        }
        res.send('Budget added successfully.');
    });
});

// API to fetch all budgets
app.get('/api/budgets', (req, res) => {
    const query = `
        select 
            b.budgetid,
            d.departmentname,
            b.allocatedamount,
            b.spentamount,
            b.remainingamount
        from budget b
        join department d on b.departmentid = d.departmentid
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching budgets:', err);
            return res.status(500).send('Error fetching budgets.');
        }
        res.json(results);
    });
});


// Route to create a purchase order
app.post('/api/create-purchase-order', (req, res) => {
    const { vendorid, contractid, departmentid, itemdetails, quantity, amount } = req.body;

    if (!vendorid || !contractid || !departmentid || !itemdetails || !quantity || !amount) {
        return res.status(400).send('All fields are required.');
    }

    const query = `select allocatedamount, spentamount from budget where departmentid = ?`;
    db.query(query, [departmentid], (err, results) => {
        if (err) {
            console.error('Error checking budget:', err);
            return res.status(500).send('Error checking budget.');
        }

        if (results.length === 0) {
            return res.status(404).send('Department budget not found.');
        }

        const { allocatedamount, spentamount } = results[0];
        const newSpent = spentamount + parseFloat(amount);

        if (newSpent > allocatedamount) {
            return res.status(400).send('Purchase order exceeds allocated budget.');
        }

        // Insert new purchase order
        const insertQuery = `
            inser into purchaseorder (vendorid, contractid, departmentid, itemdetails, quantity, amount)
            values (?, ?, ?, ?, ?, ?)
        `;
        db.query(insertQuery, [vendorid, contractid, departmentid, itemdetails, quantity, amount], (err, result) => {
            if (err) {
                console.error('Error creating purchase order:', err);
                return res.status(500).send('Error creating purchase order.');
            }

            const updateQuery = `
                update budget set spentamount = ? where departmentid = ?
            `;
            db.query(updateQuery, [newSpent, departmentid], (err) => {
                if (err) {
                    console.error('Error updating budget:', err);
                    return res.status(500).send('Error updating budget.');
                }
                res.send('Purchase order created and budget updated successfully.');
            });
        });
    });
});

// Route to fetch all purchase orders
app.get('/api/purchase-orders', (req, res) => {
    const query = `select * from purchaseorder`;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching purchase orders:', err);
            return res.status(500).send('Error fetching purchase orders.');
        }
        res.json(results);
    });
});


// Server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
