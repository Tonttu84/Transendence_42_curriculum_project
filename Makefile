.PHONY: up down restart logs auth game nginx build clean fclean env eval

export DOCKER_BUILDKIT=1

EVAL_SECRET_PATH := $(HOME)/transendence-secrets/.env

ENV_PATH=auth-service/.env
BACKEND_PORT=3003
FRONTEND_PORT=5173

GOOGLE_CLIENT_SECRET=NOT_REAL_SECRET
GOOGLE_CLIENT_ID=fakestuff-312312.aml.apps.googleusercontent.com

AUTH_DB_DIR := auth-service/db
GAME_DB_DIR := game-service/data

# Detect local IP (first non-loopback)
LOCAL_IP := $(shell hostname -I | awk '{print $$1}')

all: up

env:
	@if [ ! -f $(ENV_PATH) ]; then \
		echo "Creating $(ENV_PATH) with IP $(LOCAL_IP)"; \
		mkdir -p $(dir $(ENV_PATH)); \
		echo "# JWT" > $(ENV_PATH); \
		echo "JWT_SECRET=not-dev-secret" >> $(ENV_PATH); \
		echo "USER_TOKEN_EXPIRY=3600" >> $(ENV_PATH); \
		echo "TWO_FA_TOKEN_EXPIRY=600" >> $(ENV_PATH); \
		echo "OAUTH_STATE_TOKEN_EXPIRY=300" >> $(ENV_PATH); \
		echo "" >> $(ENV_PATH); \
		echo "# Google OAuth" >> $(ENV_PATH); \
		echo "GOOGLE_CLIENT_ID=$(GOOGLE_CLIENT_ID)" >> $(ENV_PATH); \
		echo "GOOGLE_CLIENT_SECRET=$(GOOGLE_CLIENT_SECRET)" >> $(ENV_PATH); \
		echo "GOOGLE_REDIRECT_URI=https://c2r5p11.hive.fi:5173/api/users/google/callback" >> $(ENV_PATH); \
		echo "" >> $(ENV_PATH); \
		echo "# Frontend URL" >> $(ENV_PATH); \
		echo "FRONTEND_URL=https://$(LOCAL_IP):$(FRONTEND_PORT)" >> $(ENV_PATH); \
		echo "" >> $(ENV_PATH); \
		echo "# 2FA" >> $(ENV_PATH); \
		echo "TWO_FA_URL_PREFIX=otpauth://totp/aaa?secret=" >> $(ENV_PATH); \
	else \
		echo "$(ENV_PATH) already exists, skipping creation."; \
	fi

db-dirs:
	@echo "Ensuring database directories exist..."
	mkdir -p $(AUTH_DB_DIR)
	mkdir -p $(GAME_DB_DIR)
	chmod 777 $(AUTH_DB_DIR)
	chmod 777 $(GAME_DB_DIR)
	@echo "Database directories ready."



eval:
	@if [ ! -f "$(EVAL_SECRET_PATH)" ]; then \
		echo "❌ ERROR: $(EVAL_SECRET_PATH) not found."; \
		echo "   Cannot run eval build without the secret .env file."; \
		exit 1; \
	fi
	@echo "🔐 Using eval secrets from $(EVAL_SECRET_PATH)"
	@mkdir -p $(dir $(ENV_PATH))
	@cp "$(EVAL_SECRET_PATH)" "$(ENV_PATH)"
	@echo "Copied eval .env → $(ENV_PATH)"
	$(MAKE) up
	@echo "https://c2r5p11.hive.fi:5173/"


up: env db-dirs
	@echo "Starting all services..."
	docker compose up --build -d
	@echo "Services are now running."
	@echo $(LOCAL_IP):$(FRONTEND_PORT)

down:
	@echo "Stopping all services..."
	docker compose down
	@echo "All services stopped."

restart: down up

build: env
	@echo "Building all Docker images..."
	docker compose build

logs:
	docker compose logs -f

auth:
	docker compose logs -f auth

game:
	docker compose logs -f game

nginx:
	docker compose logs -f nginx

clean:
	@echo "Cleaning Docker environment..."
	docker compose down --rmi all --volumes --remove-orphans
	@echo "Cleanup complete."

fclean: clean
	@echo "Removing env file..."
	rm -f $(ENV_PATH)
	@echo "Removing database files..."
	rm -f $(AUTH_DB_DIR)/*.sqlite
	rm -f $(GAME_DB_DIR)/*.db
	@echo "Pruning all Docker build cache..."
	docker builder prune --all -f
	@echo "Full cleanup complete."
