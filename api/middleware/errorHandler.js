const errorHandler = (err, req, res, next) => {
  const errorStatus = err.status || 500;
  const errorMessage = err.message || "Something went wrong!";

  // Handle Mongoose CastError (Invalid ID)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      status: 400,
      message: `Invalid ${err.path}: ${err.value}`,
      stack: process.env.NODE_ENV === "development" ? err.stack : {},
    });
  }

  // Handle Mongoose ValidationError
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      status: 400,
      message: messages.join(", "),
      stack: process.env.NODE_ENV === "development" ? err.stack : {},
    });
  }

  // Handle Duplicate Key Error
  if (err.code === 11000) {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    return res.status(400).json({
      success: false,
      status: 400,
      message: `Duplicate field value: ${value}. Please use another value!`,
      stack: process.env.NODE_ENV === "development" ? err.stack : {},
    });
  }

  // Handle JWT Error
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      status: 401,
      message: "Invalid token. Please log in again!",
      stack: process.env.NODE_ENV === "development" ? err.stack : {},
    });
  }

  // Handle Token Expired Error
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      status: 401,
      message: "Your token has expired! Please log in again.",
      stack: process.env.NODE_ENV === "development" ? err.stack : {},
    });
  }

  // Default Error
  return res.status(errorStatus).json({
    success: false,
    status: errorStatus,
    message: errorMessage,
    stack: process.env.NODE_ENV === "development" ? err.stack : {},
  });
};

export default errorHandler;
