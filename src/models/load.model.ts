/**
 * Represents a freight load available for carrier assignment.
 */
export interface Load {
    load_id: string; // Unique identifier for the load
    origin: string; // Starting location (city, state)
    destination: string; // Delivery location (city, state)
    pickup_datetime: string; // Date and time for pickup
    delivery_datetime: string; // Date and time for delivery
    equipment_type: string; // Type of equipment required (e.g., Dry Van, Reefer)
    loadboard_rate: number; // Listed rate for the load
    notes: string; // Additional information
    weight: number; // Load weight
    commodity_type: string; // Type of goods
    num_of_pieces: number; // Number of items
    miles: number; // Distance to travel
    dimensions: string; // Size measurements (e.g., "48x40x48 in")
}
