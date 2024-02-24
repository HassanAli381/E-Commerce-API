exports.filterObject = (obj, ...allowedFields) => {
    const retObj = {};
    Object.keys(obj).forEach(el => {
        if(allowedFields.includes(el)) {
            retObj[el] = obj[el];
        }
    });
    return retObj;
}
