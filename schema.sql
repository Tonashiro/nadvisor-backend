-- schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Table utilisateurs (stocke les infos Discord)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discord_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar TEXT,
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
  github TEXT,
  logo_url TEXT,
  banner_url TEXT,
  status TEXT CHECK (status IN ('PENDING', 'TRUSTABLE', 'SCAM', 'RUG')) DEFAULT 'PENDING',
  votes_for INTEGER DEFAULT 0,
  votes_against INTEGER DEFAULT 0,
  nads_verified BOOLEAN DEFAULT FALSE,
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
INSERT INTO categories (name, description) VALUES
('DeFi', 'Decentralized Finance'),
('NFT', 'Non-Fungible Tokens'),
('Layer 1', 'Base Layer Blockchains'),
('Layer 2', 'Scaling Solutions'),
('DAO', 'Decentralized Autonomous Organizations'),
('Gaming', 'Blockchain Gaming');

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