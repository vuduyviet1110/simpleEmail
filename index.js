require("dotenv").config();
const express = require("express");
const app = express();
const port = 8000;
const multer = require("multer");
const bodyParser = require("body-parser");
const path = require("path");
const connection = require("./dbsetup");
const cookieParser = require("cookie-parser");
let New_user_id = 6;
let new_email_id = 21;
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads"); // Thư mục lưu trữ tệp
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Tên file
  },
});
const upload = multer({ storage: storage });
//dùng template engine ejs
app.set("view engine", "ejs");
// set path của view
app.set("views", path.join(__dirname, "views"));

// config path của file static
app.use(express.static(path.join(__dirname, "public")));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cookieParser());

app.get("/", (req, res) => {
  res.render("sign-in.ejs");
});

app.post("/sign-in", function (request, response) {
  // Capture the input fields
  let email = request.body.email;
  let password = request.body.password;
  // Ensure the input fields exists and are not empty
  if (email && password) {
    // Execute SQL query that'll select the account from the database based on the specified email and password
    connection.query(
      "SELECT * FROM users WHERE user_email = ? AND user_password = ?",
      [email, password],
      function (error, matched_users) {
        // If there is an issue with the query, output the error
        if (error) throw error;
        // If the account exists
        if (matched_users.length > 0) {
          // Tạo cookie
          response.cookie("User_id", matched_users, {
            maxAge: 2 * 60 * 60 * 1000,
            httpOnly: true,
          });
          matched_users.forEach((matched_user) => {
            // Redirect to inbox page
            return response.redirect("/inbox?user_id=" + matched_user.user_id);
          });
        } else {
          response.send("Incorrect Username and/or Password!");
        }
        response.end();
      }
    );
  } else {
    response.send("Please enter Username and Password!");
    response.end();
  }
});

app.get("/inbox", (req, res) => {
  let UserId = req.cookies.User_id;
  // Nếu người dùng đã đăng nhập
  if (UserId) {
    // Thực hiện các hành động dành cho người dùng đã đăng nhập
    const userId = UserId[0].user_id;
    let _page = req.query.page ? req.query.page : 1;
    let _limit = 5;
    let _start = (_page - 1) * _limit;
    // Sử dụng Promise để thực hiện cả hai truy vấn đồng thời
    Promise.all([
      getUserById(userId),
      getEmailsReceiverByPage(userId, _start, _limit),
      getCountReceivedEmails(userId),
    ])
      .then(([matchedUser, emailsByPage, totalEmails]) => {
        if (matchedUser) {
          res.render("inbox.ejs", {
            user: matchedUser, //user
            emailsByPage: emailsByPage, // join 2 table và lấy ra emails từng trang
            totalPages: Math.ceil(totalEmails / _limit),
          });
        } else {
          res.send("Incorrect User ID!");
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Internal Server Error");
      });
  } else {
    res.send("Please log in first!");
  }
});

app.get("/outbox", (req, res) => {
  let UserId = req.cookies.User_id;
  // Nếu người dùng đã đăng nhập
  if (UserId) {
    // Thực hiện các hành động dành cho người dùng đã đăng nhập
    const userId = UserId[0].user_id;
    let _page = req.query.page ? req.query.page : 1;
    let _limit = 5;
    let _start = (_page - 1) * _limit;
    // Sử dụng Promise để thực hiện cả hai truy vấn đồng thời
    Promise.all([
      getUserById(userId),
      getEmailsSentByPage(userId, _start, _limit),
      getCountSentEmails(userId),
    ])
      .then(([matchedUser, emailsByPage, totalEmails]) => {
        if (matchedUser) {
          res.render("outbox.ejs", {
            user: matchedUser, // sign-in user
            emailsByPage: emailsByPage, // join 2 table và lấy ra emails từng trang
            totalPages: Math.ceil(totalEmails / _limit),
          });
        } else {
          res.send("Incorrect User ID!");
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Internal Server Error");
      });
  } else {
    res.send("Please log in first!");
  }
});

app.get("/sign-up", function (req, res) {
  res.render("sign-up.ejs");
});

app.post("/sign-up", async function (request, response) {
  // Capture the input fields
  let username = request.body.fullname;
  let email = request.body.email;
  let password = request.body.password;
  // Ensure the input fields exists and are not empty
  if (email && password) {
    // Execute SQL query that'll select the account from the database based on the specified email and password
    Promise.all([EmailExisted(email)])
      .then(([matched_email]) => {
        if (matched_email.length > 0) {
          response.send("Email is already existed");
        } else {
          // Email doesn't exist, proceed to insert new user
          try {
            InsertNewUser(username, email, password);
            response.send(`
            <h1>Đăng ký thành công!</h1>
            <p>Xin chào ${username}!</p>
            <p>Cảm ơn bạn đã đăng ký tài khoản.</p>
            <p><a href="/">Sign-in</a></p>
            `);
          } catch (error) {
            if (error.code === "ER_DUP_ENTRY") {
              res.send("Email is already existed");
            } else {
              res.status(500).send("Internal Server Error");
            }
          }
        }
      })
      .catch((err) => {
        console.error(err);
        response.status(500).send("Internal Server Error");
      });
  } else {
    response.send("Please enter Username and Password!");
    response.end();
  }
});

app.get("/compose", function (req, res) {
  let UserId = req.cookies.User_id;
  // Nếu người dùng đã đăng nhập
  if (UserId) {
    // Thực hiện các hành động dành cho người dùng đã đăng nhập
    const userId = UserId[0].user_id;
    // Sử dụng Promise để thực hiện cả hai truy vấn đồng thời
    Promise.all([getUserById(userId), getAllUsers()])
      .then(([matchedUser, allUsers]) => {
        if (matchedUser) {
          res.render("compose.ejs", {
            matchedUser: matchedUser,
            allUsers: allUsers,
          });
        } else {
          res.send("Incorrect User ID!");
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Internal Server Error");
      });
  } else {
    res.send("Please log in first!");
  }
});

app.post("/compose", upload.single("attachment"), function (req, res) {
  let receiver_id = req.body.recipient;
  let userId = req.cookies.User_id[0].user_id;
  let subject = req.body.subject;
  let content = req.body.Content;
  let filename = req.file ? req.file.filename : "";
  Promise.all([InsertNewEmail(userId, receiver_id, subject, content, filename)])
    .then(([newEmail]) => {
      if (newEmail) {
        setTimeout(() => {
          res.redirect("/inbox");
        }, 2000);
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Internal Server Error");
    });
});

app.get("/detail", function (req, res) {
  let UserId = req.cookies.User_id[0].user_id;
  emailId = req.query.email_id;
  Promise.all([
    getUserAndEmailInboxByEmailId(emailId),
    getUserAndEmailOutboxByEmailId(emailId),
    getUserById(UserId),
  ])
    .then(([matched_inbox_email, matched_outbox_email, user]) => {
      if (matched_inbox_email || matched_outbox_email) {
        res.render("detail.ejs", {
          matched_email: matched_inbox_email,
          matched_outbox_email: matched_outbox_email,
          user: user,
        });
      } else {
        res.send("email không tồn tại");
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Internal Server Error");
    });
});

app.get("/download/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "uploads", filename);
  res.download(filePath, filename, (err) => {
    if (err) {
      // Handle errors (file not found, etc.)
      res.status(404).send("File not found");
    }
  });
});

app.get("/download/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "uploads", filename);
  res.download(filePath, filename, (err) => {
    if (err) {
      // Handle errors (file not found, etc.)
      res.status(404).send("File not found");
    }
  });
});
app.delete("/api/emails/:emailId", (req, res) => {
  const SignInUserId = req.cookies.User_id[0].user_id;
  const emailId = parseInt(req.params.emailId);
  connection.query(
    "UPDATE emails SET is_deleted = ? , deleted_by = ? WHERE email_id = ?",
    [true, SignInUserId, emailId],
    (error, results) => {
      if (error) {
        console.error("Error updating email:", error);
        return res
          .status(500)
          .json({ success: false, error: "Internal Server Error" });
      }

      // Kiểm tra xem có bao nhiêu hàng đã bị ảnh hưởng bởi update
      if (results.affectedRows === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Email not found" });
      }

      // Gửi response thành công
      res.json({ success: true, affectedRows: results.affectedRows });
    }
  );
});

// Hàm để lấy thông tin user theo user_id
function getUserById(userId) {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT * FROM users WHERE user_id = ?",
      [userId],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result[0]);
        }
      }
    );
  });
}

// Lấy emails và user join thành một bảng để lấy receieve  name và thuộc tính của emails rồi phân trang
function getEmailsReceiverByPage(userId, start, limit) {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT * FROM emails JOIN users ON emails.sender_id = users.user_id WHERE emails.receiver_id = ? AND (emails.is_deleted = ? OR deleted_by <> ?) LIMIT ? , ? ",
      [userId, false, userId, start, limit],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
    );
  });
}

// Lấy emails và user join thành một bảng để lấy receieve  name và thuộc tính của emails rồi phân trang
function getEmailsSentByPage(userId, start, limit) {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT * FROM emails JOIN users ON emails.receiver_id = users.user_id WHERE emails.sender_id = ? AND (emails.is_deleted = ? OR deleted_by != ?) LIMIT ? , ? ",
      [userId, false, userId, start, limit],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
    );
  });
}

// Hàm để lấy danh sách emails của người dùng dựa trên receiver_id

function getUserAndEmailInboxByEmailId(emailId) {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT * FROM emails JOIN users ON emails.sender_id = users.user_id WHERE email_id = ?",
      [emailId],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result[0]);
        }
      }
    );
  });
}

function getUserAndEmailOutboxByEmailId(emailId) {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT * FROM emails JOIN users ON emails.receiver_id = users.user_id WHERE email_id = ?",
      [emailId],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result[0]);
        }
      }
    );
  });
}

//đếm tổng số mail mà user nhận được
function getCountReceivedEmails(userId) {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT COUNT(*) as Emails_Count FROM emails WHERE receiver_id = ?",
      [userId],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result[0].Emails_Count);
        }
      }
    );
  });
}

function getCountSentEmails(userId) {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT COUNT(*) as Emails_Count FROM emails WHERE sender_id = ?",
      [userId],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result[0].Emails_Count);
        }
      }
    );
  });
}

function InsertNewEmail(userId, receiver_id, subject, content, filename) {
  return new Promise((resolve, reject) => {
    const currentDate = new Date().toISOString().slice(0, 19).replace("T", " "); // Lấy ngày và giờ hiện tại
    const sqlInsertQuery = `
      INSERT INTO emails (email_id, sender_id, receiver_id, subject, message, timeReceived, filename)
      VALUES (?,?, ?, ?, ?, ?, ?);
    `;
    connection.query(
      sqlInsertQuery,
      [
        new_email_id,
        userId,
        receiver_id,
        subject,
        content,
        currentDate,
        filename,
      ],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          // Thêm dữ liệu thời gian insert vào kết quả
          result.insertedTime = currentDate;
          ++new_email_id;
          resolve(result);
        }
      }
    );
  });
}

function InsertNewUser(user_name, user_email, user_password) {
  return new Promise((resolve, reject) => {
    const sqlInsertQuery = `
      INSERT INTO users (user_id,user_name, user_email, user_password)
      VALUES (?,?, ?, ?);
    `;
    connection.query(
      sqlInsertQuery,
      [New_user_id, user_name, user_email, user_password],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          // Kết quả trả về sau khi chèn dữ liệu mới
          console.log("Inserted record ID:", result.insertId);
          ++New_user_id;
          console.log("new user id: ", New_user_id);
          resolve(result);
        }
      }
    );
  });
}

function getAllUsers() {
  return new Promise((resolve, reject) => {
    connection.query("SELECT * FROM users ", (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}
function EmailExisted(user_email) {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT * FROM users WHERE user_email = ? ",
      [user_email],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
    );
  });
}

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
