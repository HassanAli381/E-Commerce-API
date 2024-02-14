const mongoose = require("mongoose");

const validateObjectID = (objectID) => {
    const isValid = mongoose.Types.ObjectId.isValid(objectID);
    return isValid;
};

module.exports = validateObjectID;