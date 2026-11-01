# Dont execute this script directly js copy paste

# postgres
for size in 1000 10000 100000
  curl -sX POST "http://127.0.0.1:3000/admin/seed?size=$size"
  curl -sX POST "http://127.0.0.1:3000/admin/bench?ops=1000&warmup=50" | tee bench-postgres-$size.json
  echo
end


# mongo run
env DB_IMPL=mongo npm run start:dev

for size in 1000 10000 100000
  curl -sX POST "http://127.0.0.1:3000/admin/seed?size=$size"
  curl -sX POST "http://127.0.0.1:3000/admin/bench?ops=1000&warmup=50" | tee bench-mongo-$size.json
  echo
end
