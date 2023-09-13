start:
	docker compose --env-file .env up -d --build

down:
	docker compose stop

clean:
	docker compose down --rmi local -v --remove-orphans

stop:
	docker compose pause

restart:
	docker compose unpause