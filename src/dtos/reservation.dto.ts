export interface ReservationResponseDTO {
  id: number;
}

export function toReservationResponseDTO(id: number): ReservationResponseDTO {
  return { id };
}
