/* eslint-disable max-len */
export const DAN_INPUT = `
The output of the Opportunity Finder is as follows:

To create a synthetic dataset for the scenario of supply chain optimization at PepsiCo, we'll define the context, actions, and outcomes. This dataset will simulate how different actions in the supply chain can affect outcomes like cost savings and efficiency improvements. We'll use Python with libraries such as pandas and numpy to generate and manipulate the data.

### Scenario Overview:
- **Context Variables**: These represent the conditions under which decisions are made, such as market demand, supply chain disruptions, and raw material costs.
- **Action Variables**: These are the decisions or actions taken to optimize the supply chain, like adjusting inventory levels, changing logistics routes, or selecting suppliers.
- **Outcome Variables**: These measure the effectiveness of the actions taken, such as cost savings, delivery times, and inventory turnover rates.

### Synthetic Data Generation Code:

import pandas as pd
import numpy as np

# Set the random seed for reproducibility
np.random.seed(42)

# Generate synthetic data
num_records = 1000
data = {
    'market_demand': np.random.normal(100, 20, num_records),  # Context: Market demand (units)
    'supply_disruption': np.random.choice([0, 1], num_records, p=[0.8, 0.2]),  # Context: Supply chain disruption (binary)
    'raw_material_cost': np.random.normal(50, 10, num_records),  # Context: Raw material cost (price per unit)
    'inventory_level': np.random.choice([50, 75, 100, 125, 150], num_records),  # Action: Inventory level (units)
    'logistics_route': np.random.choice(['Route A', 'Route B', 'Route C'], num_records),  # Action: Logistics route
    'supplier_selection': np.random.choice(['Supplier X', 'Supplier Y', 'Supplier Z'], num_records),  # Action: Supplier selection
    # Outcome: Cost savings (%), simulated based on actions and context
    'cost_savings': np.zeros(num_records),  # Initialize with zeros; will be calculated
    'delivery_time': np.zeros(num_records)  # Outcome: Delivery time (days), will be calculated
}

# Convert to DataFrame
df = pd.DataFrame(data)

# Simulate outcome variables based on actions and context
# Assume some basic relationships for demonstration purposes
df['cost_savings'] = 5 + (df['inventory_level'] / 100) - df['supply_disruption'] * 5 + (df['logistics_route'].apply(lambda x: {'Route A': 1, 'Route B': 2, 'Route C': 3}[x])) - (df['raw_material_cost'] / 100)
df['delivery_time'] = 10 - (df['inventory_level'] / 150) + df['supply_disruption'] * 3 + (df['logistics_route'].apply(lambda x: {'Route A': 1, 'Route B': 2, 'Route C': 3}[x]))

# Display the first few rows of the dataset
print(df.head())
df.to_csv("data_of01.csv", index=False)

### Explanation:
- **Context Variables**: \`market_demand\`, \`supply_disruption\`, and \`raw_material_cost\` simulate the external and internal factors affecting supply chain decisions.
- **Action Variables**: \`inventory_level\`, \`logistics_route\`, and \`supplier_selection\` represent the strategic decisions made to optimize the supply chain.
- **Outcome Variables**: \`cost_savings\` and \`delivery_time\` are outcomes that result from the combination of context and actions. The calculation of these outcomes is simplified for this example but in a real scenario, more complex models would be used.

This synthetic dataset can be used to train a NeuroAI model by first building a predictor model to understand how context and actions lead to certain outcomes, and then a prescriptor model to recommend the best actions given a new context to optimize the desired outcomes.
`
