let self = undefined;

function getSelf() {
  return self;
}

function setSelf(data) {
  self = { ...data };
}

module.exports = {
  getSelf,
  setSelf,
};
