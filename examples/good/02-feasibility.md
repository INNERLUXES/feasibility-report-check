## Technical feasibility

Rating: feasible

The locker vendor offers a web interface to reserve a compartment, open it with a one-time code and release it. A
prototype built against the vendor test system covered the booking flow end to end. The quality characteristics that
matter most here are reliability (a failed booking strands a parcel) and performance under the evening peak.

### Prototype results

- The prototype reserved, opened and released 1,200 compartments on the vendor test system with no failed call.
- The median booking took 0.8 seconds and the slowest took 3.1 seconds.

### Prototype limits

- The vendor test system holds 40 lockers; production at the first two depots holds 600, so load was not tried at
  full size.
- Label printing was not part of the prototype.

## Financial feasibility

Rating: feasible with conditions

The service pays for itself in 14 to 20 months if 30 to 40 percent of the customers who now collect at a depot counter
switch to lockers. Below that share it does not pay back within the rental term.

## Operational feasibility

Rating: amber

Depot staff need to restock the lockers twice a day and clear uncollected parcels after three days. The evening shift
has the time for this at the two largest depots, but not yet at the smaller ones.

## Schedule feasibility

Rating: feasible

The first release takes 10 to 14 weeks with the current team of four, starting once the data processing terms are
signed.

## Legal and compliance

Rating: at risk

Customer names and phone numbers pass to the locker vendor, so the vendor must sign data processing terms and keep the
data in the same region. The vendor has agreed in principle but has not signed.

## Security feasibility

Rating: feasible

One-time codes expire after the parcel is collected or after three days, whichever comes first, and the vendor
interface accepts calls only from the courier network.
