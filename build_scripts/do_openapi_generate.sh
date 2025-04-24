#yarn swagger-typescript-api generate \
#  --module-name-index 1 \
#  --unwrap-response-data -t \
#  ./client/templates \
#  --path swagger.json \
#  --output ./generated/rest/neuro-san \
#  --name NeuroSanClient.ts \
#  --silent



yarn openapi-typescript https://neuro-san.decisionai.ml/api/v1/docs -o ./generated/neuro-san/NeuroSanClient.d.ts
