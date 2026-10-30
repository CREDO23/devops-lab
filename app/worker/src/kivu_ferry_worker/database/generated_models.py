from typing import Optional
import datetime
import enum
import uuid

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKeyConstraint, Index, Integer, PrimaryKeyConstraint, String, Text, UniqueConstraint, Uuid, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass


class BookingStatus(str, enum.Enum):
    PENDING_PAYMENT = 'PENDING_PAYMENT'
    CONFIRMED = 'CONFIRMED'
    FAILED = 'FAILED'
    EXPIRED = 'EXPIRED'
    PAID_AFTER_EXPIRY = 'PAID_AFTER_EXPIRY'


class Language(str, enum.Enum):
    EN = 'en'
    FR = 'fr'
    SW = 'sw'


class Boats(Base):
    __tablename__ = 'boats'
    __table_args__ = (
        CheckConstraint('seat_columns > 0 AND (seat_columns %% 2) = 0', name='boats_seat_columns_check'),
        CheckConstraint('seat_rows > 0', name='boats_seat_rows_check'),
        PrimaryKeyConstraint('id', name='boats_pkey'),
        UniqueConstraint('name', name='boats_name_key')
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('uuidv7()'))
    name: Mapped[str] = mapped_column(Text, nullable=False)
    seat_rows: Mapped[int] = mapped_column(Integer, nullable=False)
    seat_columns: Mapped[int] = mapped_column(Integer, nullable=False)

    trips: Mapped[list['Trips']] = relationship('Trips', back_populates='boat')


class Ports(Base):
    __tablename__ = 'ports'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='ports_pkey'),
        UniqueConstraint('name', name='ports_name_key')
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('uuidv7()'))
    name: Mapped[str] = mapped_column(Text, nullable=False)

    routes_destination_port: Mapped[list['Routes']] = relationship('Routes', foreign_keys='[Routes.destination_port_id]', back_populates='destination_port')
    routes_origin_port: Mapped[list['Routes']] = relationship('Routes', foreign_keys='[Routes.origin_port_id]', back_populates='origin_port')


class SchemaMigrations(Base):
    __tablename__ = 'schema_migrations'
    __table_args__ = (
        PrimaryKeyConstraint('version', name='schema_migrations_pkey'),
    )

    version: Mapped[str] = mapped_column(String, primary_key=True)


class Routes(Base):
    __tablename__ = 'routes'
    __table_args__ = (
        CheckConstraint('fare_cents > 0', name='routes_fare_cents_check'),
        CheckConstraint('origin_port_id <> destination_port_id', name='routes_check'),
        ForeignKeyConstraint(['destination_port_id'], ['ports.id'], name='routes_destination_port_id_fkey'),
        ForeignKeyConstraint(['origin_port_id'], ['ports.id'], name='routes_origin_port_id_fkey'),
        PrimaryKeyConstraint('id', name='routes_pkey'),
        UniqueConstraint('origin_port_id', 'destination_port_id', name='routes_origin_port_id_destination_port_id_key')
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('uuidv7()'))
    origin_port_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    destination_port_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    fare_cents: Mapped[int] = mapped_column(Integer, nullable=False)

    destination_port: Mapped['Ports'] = relationship('Ports', foreign_keys=[destination_port_id], back_populates='routes_destination_port')
    origin_port: Mapped['Ports'] = relationship('Ports', foreign_keys=[origin_port_id], back_populates='routes_origin_port')
    trips: Mapped[list['Trips']] = relationship('Trips', back_populates='route')


class Trips(Base):
    __tablename__ = 'trips'
    __table_args__ = (
        CheckConstraint('arrives_at > departs_at', name='trips_check'),
        ForeignKeyConstraint(['boat_id'], ['boats.id'], name='trips_boat_id_fkey'),
        ForeignKeyConstraint(['route_id'], ['routes.id'], name='trips_route_id_fkey'),
        PrimaryKeyConstraint('id', name='trips_pkey'),
        UniqueConstraint('boat_id', 'departs_at', name='trips_boat_id_departs_at_key')
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('uuidv7()'))
    route_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    boat_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    departs_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False)
    arrives_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False)

    boat: Mapped['Boats'] = relationship('Boats', back_populates='trips')
    route: Mapped['Routes'] = relationship('Routes', back_populates='trips')
    bookings: Mapped[list['Bookings']] = relationship('Bookings', back_populates='trip')


class Bookings(Base):
    __tablename__ = 'bookings'
    __table_args__ = (
        CheckConstraint('amount_cents > 0', name='bookings_amount_cents_check'),
        ForeignKeyConstraint(['trip_id'], ['trips.id'], name='bookings_trip_id_fkey'),
        PrimaryKeyConstraint('id', name='bookings_pkey'),
        UniqueConstraint('payment_reference', name='bookings_payment_reference_key'),
        UniqueConstraint('reference', name='bookings_reference_key'),
        Index('one_active_booking_per_seat', 'trip_id', 'seat', postgresql_where="(status = ANY (ARRAY['PENDING_PAYMENT'::booking_status, 'CONFIRMED'::booking_status]))", unique=True)
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('uuidv7()'))
    reference: Mapped[str] = mapped_column(Text, nullable=False)
    trip_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    seat: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[Language] = mapped_column(Enum(Language, values_callable=lambda cls: [member.value for member in cls], name='language'), nullable=False)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    payment_reference: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    status: Mapped[BookingStatus] = mapped_column(Enum(BookingStatus, values_callable=lambda cls: [member.value for member in cls], name='booking_status'), nullable=False, server_default=text("'PENDING_PAYMENT'::booking_status"))
    expires_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))

    trip: Mapped['Trips'] = relationship('Trips', back_populates='bookings')
    tickets: Mapped['Tickets'] = relationship('Tickets', uselist=False, back_populates='booking')


class Tickets(Base):
    __tablename__ = 'tickets'
    __table_args__ = (
        ForeignKeyConstraint(['booking_id'], ['bookings.id'], name='tickets_booking_id_fkey'),
        PrimaryKeyConstraint('id', name='tickets_pkey'),
        UniqueConstraint('booking_id', name='tickets_booking_id_key')
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('uuidv7()'))
    booking_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    sms_sent_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    pdf_location: Mapped[Optional[str]] = mapped_column(Text)

    booking: Mapped['Bookings'] = relationship('Bookings', back_populates='tickets')
