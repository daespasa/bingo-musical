import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ReorderError, planReorder } from './reorder';

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Devuelve la colección solo si esta persona puede modificarla. Las de
   * demostración y las temáticas las mantiene la aplicación, así que se ven
   * pero no se tocan.
   */
  private async ownedOrFail(id: string, ownerId: string) {
    const collection = await this.prisma.musicCollection.findUnique({ where: { id } });
    if (!collection) throw new NotFoundException('Esa colección ya no existe');
    if (collection.isDemo) {
      throw new ForbiddenException('Las colecciones de la aplicación no se pueden modificar');
    }
    if (collection.ownerId !== ownerId) {
      throw new ForbiddenException('Esa colección no es tuya');
    }
    return collection;
  }

  async create(ownerId: string, name: string, description?: string): Promise<{ id: string }> {
    const clean = name.trim();
    if (clean.length < 2) throw new BadRequestException('Ponle un nombre de al menos 2 caracteres');
    const collection = await this.prisma.musicCollection.create({
      data: { name: clean.slice(0, 80), description: description?.trim().slice(0, 300), ownerId },
    });
    return { id: collection.id };
  }

  /**
   * Copia una colección para poder tocarla. Es la forma de partir de una
   * colección de la aplicación, que es de solo lectura, sin rehacerla a mano.
   */
  async duplicate(id: string, ownerId: string, name?: string): Promise<{ id: string }> {
    const source = await this.prisma.musicCollection.findFirst({
      where: { id, OR: [{ isDemo: true }, { ownerId }] },
      include: { tracks: { orderBy: { position: 'asc' }, select: { trackId: true } } },
    });
    if (!source) throw new NotFoundException('Esa colección ya no existe');

    const copy = await this.prisma.musicCollection.create({
      data: {
        name: (name?.trim() || `${source.name} (copia)`).slice(0, 80),
        description: source.description,
        ownerId,
        tracks: {
          create: source.tracks.map((t, position) => ({ trackId: t.trackId, position })),
        },
      },
    });
    return { id: copy.id };
  }

  async rename(
    id: string,
    ownerId: string,
    name: string,
    description?: string | null,
  ): Promise<void> {
    await this.ownedOrFail(id, ownerId);
    const clean = name.trim();
    if (clean.length < 2) throw new BadRequestException('Ponle un nombre de al menos 2 caracteres');
    await this.prisma.musicCollection.update({
      where: { id },
      data: {
        name: clean.slice(0, 80),
        description: description === null ? null : description?.trim().slice(0, 300),
      },
    });
  }

  /**
   * Borrar una colección que usan partidas rompería su historial, y la relación
   * es obligatoria, así que la base de datos lo rechazaría con un error
   * incomprensible. Mejor explicarlo.
   */
  async remove(id: string, ownerId: string): Promise<void> {
    await this.ownedOrFail(id, ownerId);
    const games = await this.prisma.game.count({ where: { collectionId: id } });
    if (games > 0) {
      throw new ConflictException(
        games === 1
          ? 'No se puede borrar: hay una partida que la usa. Borra antes esa partida.'
          : `No se puede borrar: hay ${games} partidas que la usan. Bórralas antes.`,
      );
    }
    await this.prisma.musicCollection.delete({ where: { id } });
  }

  async removeTrack(id: string, ownerId: string, trackId: string): Promise<void> {
    await this.ownedOrFail(id, ownerId);
    const deleted = await this.prisma.musicCollectionTrack.deleteMany({
      where: { collectionId: id, trackId },
    });
    if (deleted.count === 0) throw new NotFoundException('Esa canción no está en la colección');
    await this.compactPositions(id);
  }

  /**
   * Reescribe el orden completo. Se hace en dos pasadas dentro de una
   * transacción porque las posiciones son únicas por colección.
   */
  async reorder(id: string, ownerId: string, trackIds: string[]): Promise<void> {
    await this.ownedOrFail(id, ownerId);
    const current = await this.prisma.musicCollectionTrack.findMany({
      where: { collectionId: id },
      orderBy: { position: 'asc' },
      select: { trackId: true },
    });

    let plan;
    try {
      plan = planReorder(
        current.map((c) => c.trackId),
        trackIds,
      );
    } catch (error) {
      if (error instanceof ReorderError) throw new BadRequestException(error.message);
      throw error;
    }

    await this.prisma.$transaction(async (tx) => {
      for (const change of plan.parking) {
        await tx.musicCollectionTrack.update({
          where: { collectionId_trackId: { collectionId: id, trackId: change.trackId } },
          data: { position: change.position },
        });
      }
      for (const change of plan.final) {
        await tx.musicCollectionTrack.update({
          where: { collectionId_trackId: { collectionId: id, trackId: change.trackId } },
          data: { position: change.position },
        });
      }
    });
  }

  /** Quita los huecos que deja borrar una canción, para que el orden no salte. */
  private async compactPositions(collectionId: string): Promise<void> {
    const rows = await this.prisma.musicCollectionTrack.findMany({
      where: { collectionId },
      orderBy: { position: 'asc' },
      select: { trackId: true },
    });
    await this.reorderRaw(
      collectionId,
      rows.map((r) => r.trackId),
    );
  }

  private async reorderRaw(collectionId: string, trackIds: string[]): Promise<void> {
    const plan = planReorder(trackIds, trackIds);
    await this.prisma.$transaction(async (tx) => {
      for (const change of plan.parking) {
        await tx.musicCollectionTrack.update({
          where: { collectionId_trackId: { collectionId, trackId: change.trackId } },
          data: { position: change.position },
        });
      }
      for (const change of plan.final) {
        await tx.musicCollectionTrack.update({
          where: { collectionId_trackId: { collectionId, trackId: change.trackId } },
          data: { position: change.position },
        });
      }
    });
  }
}
