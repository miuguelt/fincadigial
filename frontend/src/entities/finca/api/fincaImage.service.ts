import api from "@/shared/api/client";
import { FINCA_IMAGES_ENDPOINTS } from "@/shared/config/apiEndpoints";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export interface FincaImage {
	id: number;
	finca_id: number;
	filename: string;
	filepath: string;
	file_size: number;
	mime_type: string;
	is_primary: boolean;
	url: string;
	thumbnail_url?: string;
	created_at: string;
	updated_at?: string;
}

export interface FincaImagesResponse {
	success: boolean;
	message: string;
	data: {
		finca_id: number;
		total: number;
		images: FincaImage[];
	};
}

export interface ImageUploadResponse {
	success: boolean;
	message: string;
	data: {
		uploaded: Array<{
			id: number;
			filename: string;
			url: string;
			size: number;
			optimized: boolean;
		}>;
		total_uploaded: number;
		total_errors: number;
		errors?: Array<{ filename: string; error: string }> | null;
	};
}

export const fincaImageService = {
	async uploadImages(
		fincaId: number,
		files: File[],
		onProgress?: (progress: number) => void,
	): Promise<ImageUploadResponse> {
		if (!fincaId || fincaId <= 0)
			throw new Error("El ID de la finca es requerido");
		if (!files || files.length === 0)
			throw new Error("Debe seleccionar al menos una imagen");

		const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
		for (const file of files) {
			if (!allowedTypes.includes(file.type)) {
				throw new Error(
					`Tipo no permitido: ${file.type}. Solo JPG, PNG, WEBP, GIF`,
				);
			}
			if (file.size > MAX_IMAGE_SIZE) {
				throw new Error(`La imagen ${file.name} supera el límite de 10 MB`);
			}
		}

		const formData = new FormData();
		formData.append("finca_id", fincaId.toString());
		for (const file of files) {
			formData.append("files", file);
		}

		const response = await api.post<ImageUploadResponse>(
			FINCA_IMAGES_ENDPOINTS.UPLOAD,
			formData,
			{
				headers: {},
				onUploadProgress: (progressEvent) => {
					if (onProgress && progressEvent.total) {
						onProgress(
							Math.round((progressEvent.loaded * 100) / progressEvent.total),
						);
					}
				},
			},
		);
		return response.data;
	},

	async getFincaImages(fincaId: number): Promise<FincaImagesResponse> {
		if (!fincaId || fincaId <= 0)
			throw new Error("El ID de la finca es requerido");

		const response = await api.get<FincaImagesResponse>(
			FINCA_IMAGES_ENDPOINTS.GET_BY_FINCA(fincaId),
			{ params: { _ts: Date.now() }, headers: { "Cache-Control": "no-cache" } },
		);

		const responseData = response.data;
		if (responseData?.data?.images) {
			responseData.data.images = responseData.data.images.map((img) => ({
				...img,
				url: img.url?.startsWith("/") ? img.url : `/${img.url}`,
				thumbnail_url: img.thumbnail_url?.startsWith("/")
					? img.thumbnail_url
					: `/${img.thumbnail_url ?? ""}`,
			}));
		}
		return responseData;
	},

	async deleteImage(imageId: number): Promise<void> {
		if (!imageId || imageId <= 0)
			throw new Error("El ID de la imagen es requerido");
		await api.delete(FINCA_IMAGES_ENDPOINTS.DELETE(imageId));
	},

	async setPrimaryImage(imageId: number): Promise<FincaImage> {
		if (!imageId || imageId <= 0)
			throw new Error("El ID de la imagen es requerido");
		const response = await api.put<{ success: boolean; data: FincaImage }>(
			FINCA_IMAGES_ENDPOINTS.SET_PRIMARY(imageId),
		);
		return response.data.data;
	},
};
