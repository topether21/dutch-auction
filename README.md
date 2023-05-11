## Deploy

```
serverless deploy --verbose
```

### Create an auction

```
current_timestamp=$(date +%s) && start_timestamp=$((current_timestamp + 10)) && curl -X POST -H "Content-Type: application/json" -d '{"startPrice": 1, "minPrice": 0.2, "decreaseAmount": 0.05, "roundDuration": 60, "startTimestamp": '"$start_timestamp"'}' https://37qnx0shxl.execute-api.us-east-1.amazonaws.com/dev/createAuction
```

### Get an auction

```
https://37qnx0shxl.execute-api.us-east-1.amazonaws.com/dev/auctions
```
