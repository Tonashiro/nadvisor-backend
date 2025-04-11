// graphql/dataSources/index.js
const ProjectAPI = require("./projectAPI");
const UserAPI = require("./UserAPI");
const VoteAPI = require("./VoteAPI");
const CriteriaAPI = require("./CriteriaAPI");
const AlertAPI = require("./AlertAPI");

module.exports = {
  ProjectAPI,
  UserAPI,
  VoteAPI,
  CriteriaAPI,
  AlertAPI,
};
