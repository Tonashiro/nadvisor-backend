-- schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Table utilisateurs (stocke les infos Discord)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discord_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar TEXT,
  wallet_address TEXT UNIQUE DEFAULT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  can_vote BOOLEAN DEFAULT FALSE,
  discord_role TEXT CHECK (discord_role IN ('MON', 'OG', 'NAD', 'FULL_ACCESS')) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  twitter_id TEXT UNIQUE,
  twitter_username TEXT,
  twitter_access_token TEXT,
  twitter_refresh_token TEXT,
);

-- Table catégories de projets
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

-- Table projets
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  website TEXT,
  twitter TEXT,
  discord TEXT,
  logo_url TEXT,
  banner_url TEXT,
  status TEXT CHECK (status IN ('PENDING', 'TRUSTABLE', 'SCAM', 'RUG')) DEFAULT 'PENDING',
  votes_for INTEGER DEFAULT 0,
  votes_against INTEGER DEFAULT 0,
  nads_verified BOOLEAN DEFAULT FALSE,
  nads_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table relation projets-catégories
CREATE TABLE project_categories (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, category_id)
);

-- Table votes
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  vote_type TEXT CHECK (vote_type IN ('FOR', 'AGAINST')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_role TEXT CHECK (user_role IN ('MON', 'OG', 'NAD', 'FULL_ACCESS')) DEFAULT NULL,
  UNIQUE(user_id, project_id)
);

-- Table to store votes breakdown by role for each project
CREATE TABLE project_votes_by_role (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('MON', 'OG', 'NAD', 'FULL_ACCESS')) NOT NULL,
  votes_for INTEGER DEFAULT 0,
  votes_against INTEGER DEFAULT 0,
  PRIMARY KEY (project_id, role)
);

-- Insérer quelques catégories de base
INSERT INTO categories (id, name, description) VALUES
('60e1ec12-8188-4310-885c-51590fe0043d', 'DeFi', 'Decentralized Finance'),
('89fef89f-086a-4ee4-a300-219cdfb74340', 'Devnads', 'Devnads Projects'),
('7ac5e36a-c1ff-48ca-8ea4-a0a0df197bf9', 'NFT', 'Non-Fungible Tokens'),
('c2927e05-37c2-4239-ada7-dc62417329cf', 'DAO', 'Decentralized Autonomous Organizations'),
('ef938e1b-1fbc-4d62-b1d7-1f1e4ec79daf', 'Gaming', 'Blockchain Gaming'),
('67767c4d-4ddf-41f4-bf4f-5fce499e2443', 'Infra', 'Projects related to blockchain infrastructure and tooling'),
('8b85bc14-1902-4046-82c9-b60c3d077a3f', 'AI', 'Projects using artificial intelligence to automate or enhance decision-making, predictions, or personalization.'),
('43be2bd6-3231-4aca-88e1-7adcc512caf8', 'Betting', 'Platforms focused on gambling, wagering, or risk-based games, including sports and crypto betting.'),
('e892e69c-df8f-4eef-85e8-ccb44d6c0dba', 'DePIN', 'Decentralized Physical Infrastructure Networks—projects building real-world infrastructure like storage, bandwidth, or sensors through blockchain incentives.'),
('a582c6bd-e459-4a2d-bb47-5107c7de9889', 'Governance', 'Projects that enable decentralized voting, DAO management, or community decision-making systems.'),
('888c75e2-6377-42b4-83e6-3540791db71f', 'Launchpad', 'Platforms helping new projects raise funds and launch tokens through IDOs, INOs, or similar mechanisms.'),
('c16860ad-4c44-4711-8bf7-2bc2e8bb2994', 'Payments', 'Solutions for processing, sending, or receiving crypto or fiat payments efficiently and securely.'),
('f3d88555-3bb5-4f6e-a9af-236e797274bd', 'RWA', 'Real World Assets—tokenized representations of physical assets like real estate, commodities, or bonds.'),
('f8f13b67-bfaf-4eb8-8499-b8c4503c2a98', 'Social', 'Blockchain-based social networks, messaging apps, or platforms for content sharing and community building.'),
('a89b3769-e03b-4e3a-b45e-82e17d59b4c7', 'Account Abstraction', 'Projects enabling smart contract wallets or flexible account management beyond standard EOA wallets.'),
('4ed0a82c-7fa9-41f3-9f20-926f45dba7b4', 'Analytics', 'Tools providing blockchain data visualization, metrics, dashboards, or insights for users and developers.'),
('e2137379-84de-481d-8f05-ae31564059a5', 'Cross-Chain', 'Projects facilitating interoperability or asset movement between different blockchains.'),
('e38a3547-9f8b-4dde-990e-3a4c3108a266', 'Dev Tooling', 'Developer-focused tools, SDKs, or infrastructure that support building and testing Web3 applications.'),
('e5ae7fe7-eb68-4b1a-b034-891a93da4fff', 'Gaming Infra', 'Backend services, engines, or SDKs that power blockchain games and game economies.'),
('5b0b3597-21ef-437b-94d1-5351226fef57', 'Indexer', 'Services that organize and make blockchain data easily accessible for developers and users.'),
('3ee1bea7-d58a-440d-9745-9e7fbf73a526', 'Onramp', 'Platforms that allow users to convert fiat into crypto assets, typically via card or bank payments.'),
('0ab1f174-1423-4cc8-93b1-7f298f2dab1e', 'Oracle', 'Projects providing reliable off-chain data to smart contracts (e.g., prices, weather, random numbers).'),
('36335170-248e-425b-9659-0f1b235c6145', 'Other Infra', 'Miscellaneous blockchain infrastructure projects not covered by other categories.'),
('563ffd90-81ef-487e-8772-f93259e0d471', 'Privacy', 'Protocols or tools enhancing user privacy, anonymity, or confidential transactions on-chain.'),
('03839955-5e4e-46d1-ab65-855d3f8573ac', 'RPC', 'Remote Procedure Call providers offering access points to blockchain networks for dApps and users.'),
('fa8126be-0fc3-4dc9-865e-6ec1d725e85e', 'Stablecoin', 'Projects issuing or managing tokens pegged to stable assets like the US Dollar or Euro.'),
('9ca88b66-423b-48a4-9d7a-a1ba7aeea9c8', 'Wallet', 'Digital wallets that manage crypto assets, NFTs, identities, or interact with dApps.'),
('e5cba244-327d-4780-a266-da3f31a2d058', 'Zero-Knowledge', 'Projects leveraging ZK cryptography for scalability, privacy, or trustless proof systems.'),
('83250a24-bca5-4ee3-9aa3-320f3bca824d', 'Perps', 'Decentralized trading platforms that offer perpetual contracts—derivatives with no expiry—allowing users to trade crypto assets with leverage.'),
('59069236-cde3-4b0d-8489-1e4800fc32ff', 'DEX', 'Decentralized Exchanges that enable peer-to-peer crypto trading without intermediaries, using automated market makers (AMMs) or order books.'),
('9b9e60e0-78a0-4f80-907b-df6e6d06c892', 'Prediction Market', 'Platforms where users can bet on the outcome of real-world events like elections or markets.');

-- Fonction pour mettre à jour les compteurs de votes
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'FOR' THEN
      UPDATE projects SET votes_for = votes_for + 1 WHERE id = NEW.project_id;
    ELSE
      UPDATE projects SET votes_against = votes_against + 1 WHERE id = NEW.project_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type = 'FOR' AND NEW.vote_type = 'AGAINST' THEN
      UPDATE projects SET votes_for = votes_for - 1, votes_against = votes_against + 1 WHERE id = NEW.project_id;
    ELSIF OLD.vote_type = 'AGAINST' AND NEW.vote_type = 'FOR' THEN
      UPDATE projects SET votes_for = votes_for + 1, votes_against = votes_against - 1 WHERE id = NEW.project_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'FOR' THEN
      UPDATE projects SET votes_for = votes_for - 1 WHERE id = OLD.project_id;
    ELSE
      UPDATE projects SET votes_against = votes_against - 1 WHERE id = OLD.project_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour les votes
CREATE TRIGGER on_vote_changed
AFTER INSERT OR UPDATE OR DELETE ON votes
FOR EACH ROW EXECUTE FUNCTION update_vote_counts();

-- Function to count distinct user IDs
CREATE OR REPLACE FUNCTION count_distinct_user_ids()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(DISTINCT user_id) FROM votes);
END;
$$ LANGUAGE plpgsql;