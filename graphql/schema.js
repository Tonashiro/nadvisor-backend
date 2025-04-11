// graphql/schema.js
const { gql } = require("apollo-server-express");

const typeDefs = gql`
  enum ProjectStatus {
    PENDING
    VERIFIED
    UNVERIFIED
    SCAM
    RUG
  }

  enum VoteValue {
    YES
    NO
  }

  type Project {
    id: ID!
    name: String!
    description: String!
    website: String
    github: String
    twitter: String
    telegram: String
    discord: String
    contractAddress: String
    createdAt: String!
    updatedAt: String!
    status: ProjectStatus!
    votes: [Vote!]!
    averageScore: Float
    reviewsCount: Int!
  }

  type User {
    id: ID!
    walletAddress: String!
    discordId: String
    hasMonRole: Boolean!
    isTrustedVoter: Boolean!
    createdAt: String!
    votes: [Vote!]!
  }

  type Vote {
    id: ID!
    project: Project!
    user: User!
    value: VoteValue!
    comment: String
    criteriaVotes: [CriteriaVote!]!
    createdAt: String!
  }

  type Criteria {
    id: ID!
    name: String!
    description: String!
    weight: Float!
  }

  type CriteriaVote {
    id: ID!
    criteria: Criteria!
    value: VoteValue!
    comment: String
  }

  type Alert {
    id: ID!
    project: Project!
    message: String!
    alertType: ProjectStatus!
    createdAt: String!
  }

  type Query {
    # Projects
    projects(status: ProjectStatus): [Project!]!
    project(id: ID!): Project

    # Users - minimal queries, assuming frontend handles auth
    me: User

    # Votes
    votes(projectId: ID): [Vote!]!

    # Criteria
    criterias: [Criteria!]!

    # Alerts
    alerts: [Alert!]!
  }

  type Mutation {
    # User handling - simplified
    registerUser(
      walletAddress: String!
      discordId: String
      hasMonRole: Boolean!
    ): User!

    updateUserRoles(
      id: ID!
      hasMonRole: Boolean
      isTrustedVoter: Boolean
    ): User!

    # Projects
    createProject(
      name: String!
      description: String!
      website: String
      github: String
      twitter: String
      telegram: String
      discord: String
      contractAddress: String
    ): Project!

    updateProject(
      id: ID!
      name: String
      description: String
      website: String
      github: String
      twitter: String
      telegram: String
      discord: String
      contractAddress: String
    ): Project!

    changeProjectStatus(projectId: ID!, status: ProjectStatus!): Project!

    # Votes
    submitVote(
      projectId: ID!
      userId: ID!
      value: VoteValue!
      comment: String
      criteriaVotes: [CriteriaVoteInput!]
    ): Vote!

    # Alerts
    createAlert(
      projectId: ID!
      message: String!
      alertType: ProjectStatus!
    ): Alert!
  }

  input CriteriaVoteInput {
    criteriaId: ID!
    value: VoteValue!
    comment: String
  }

  type Subscription {
    projectStatusChanged: Project!
    newVoteAdded(projectId: ID): Vote!
    newAlertCreated: Alert!
  }
`;

module.exports = typeDefs;
