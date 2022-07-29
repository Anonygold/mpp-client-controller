
const jsonValidity = (json) => {
  let result = true;
  try {
    JSON.parse(json);
  } catch (e) {
    result = false;
  }
  return result;
};

export default jsonValidity;
