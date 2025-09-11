-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 05, 2025 at 12:19 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `smanung_library_db_new`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `id_admin` int(11) NOT NULL,
  `nama_admin` varchar(255) NOT NULL,
  `discord_id` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`id_admin`, `nama_admin`, `discord_id`) VALUES
(3, 'kyube', '1138656034089615470');

-- --------------------------------------------------------

--
-- Table structure for table `app_config`
--

CREATE TABLE `app_config` (
  `config_key` varchar(50) NOT NULL,
  `config_value` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `app_config`
--

INSERT INTO `app_config` (`config_key`, `config_value`) VALUES
('rules_channel_id', '1410645949033746474'),
('rules_content', '# 👋 Selamat Datang di Perpustakaan Digital SMAN Unggulan!\n\nBot ini dirancang untuk membantu Anda mengakses semua layanan perpustakaan dengan mudah. Silakan baca panduan di bawah ini sesuai dengan peran Anda.\n\n**💡 Cara Menggunakan Perintah:**\nSemua perintah dimulai dengan tanda garis miring (`/`). Cukup ketik `/` di kolom chat, maka daftar perintah yang tersedia untuk Anda akan muncul.\n\n---\n\n###  ruolo Belum Terdaftar\nSebagai anggota baru, Anda memiliki akses terbatas. Langkah pertama Anda adalah melakukan registrasi untuk mendapatkan akses penuh.\n\n*   `/register`\n    Gunakan perintah ini untuk mendaftarkan diri Anda sebagai siswa atau guru. Ikuti instruksi pada form yang muncul.\n\n*   `/login`\n    Jika Anda **sudah pernah mendaftar** sebelumnya lalu keluar dari server, gunakan perintah ini untuk masuk kembali dan memulihkan peran Anda.\n\n---\n\n### 📚 Perintah untuk Siswa & Guru\nSetelah terverifikasi, Anda bisa menggunakan semua fitur perpustakaan berikut:\n\n*   `/cari_buku [query]`\n    Mencari ketersediaan buku fisik di perpustakaan. Contoh: `/cari_buku fisika`\n\n*   `/pinjam`\n    Memulai proses peminjaman buku pelajaran untuk kelas Anda.\n\n*   `/kembalikan`\n    Memulai proses pengembalian buku yang telah dipinjam oleh kelas Anda.\n\n*   `/status`\n    Melihat status peminjaman buku di kelas Anda saat ini.\n\n*   `/cari_ebook [query]`\n    Mencari e-book yang tersedia di database.\n\n*   `/diskusi [topik]`\n    Mengajukan permintaan untuk membuka channel diskusi sementara mengenai topik pelajaran.\n\n*   `/lupa_password`\n    Memulai proses untuk mereset password akun Anda jika lupa.\n\n---\n\n### 👑 Perintah Khusus Admin\nPara admin memiliki akses ke serangkaian perintah tambahan untuk mengelola sistem, seperti menambah buku, mengelola e-book, mengatur peran, dan memelihara data perpustakaan. Perintah-perintah ini tidak akan terlihat oleh pengguna biasa.\n\n---\n\nTerima kasih telah bergabung dan selamat menggunakan fasi... [truncated]
'),
('rules_message_id', '1410694855977472152');

-- --------------------------------------------------------

--
-- Table structure for table `buku`
--

CREATE TABLE `buku` (
  `id_buku` int(11) NOT NULL,
  `nama_buku` varchar(255) NOT NULL,
  `tingkat_kelas` enum('X','XI','XII') DEFAULT NULL,
  `mata_pelajaran_terkait` varchar(100) DEFAULT NULL,
  `total_stok` int(11) NOT NULL,
  `stok_tersedia` int(11) NOT NULL,
  `penerbit` varchar(100) DEFAULT NULL,
  `status` enum('Tersedia','Dipinjam') DEFAULT 'Tersedia',
  `file_sampul` varchar(255) DEFAULT NULL,
  `tahun_terbit` int(11) DEFAULT NULL,
  `isbn` varchar(255) DEFAULT NULL,
  `genre` varchar(100) DEFAULT NULL,
  `lokasi_rak` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `buku`
--

INSERT INTO `buku` (`id_buku`, `nama_buku`, `tingkat_kelas`, `mata_pelajaran_terkait`, `total_stok`, `stok_tersedia`, `penerbit`, `status`, `file_sampul`, `tahun_terbit`, `isbn`, `genre`, `lokasi_rak`) VALUES
(1, 'PPKN', NULL, 'PKN', 21, 21, NULL, 'Tersedia', NULL, NULL, NULL, NULL, NULL),
(2, 'Matematika Terapan', 'XI', 'MTK', 50, 0, NULL, 'Tersedia', '1756575076785-4ebf681a-8362-4da0-86c8-761fe14d7ae5.jpg', 2020, '978-623-02-0180-6', 'Buku Pelajaran', '1756575077206-OIP.jpeg'),
(7, 'Inforamatik terapan', NULL, 'informatika', 30, 30, NULL, 'Tersedia', NULL, NULL, NULL, NULL, NULL),
(8, 'agama islam', NULL, 'agama', 20, 20, NULL, 'Tersedia', NULL, NULL, NULL, NULL, NULL),
(9, 'fisika', NULL, 'fisika', 13, 13, NULL, 'Tersedia', NULL, NULL, NULL, NULL, NULL),
(10, 'BIOLOGI', NULL, 'BIOLOGI', 34, 29, NULL, 'Tersedia', NULL, NULL, NULL, NULL, NULL),
(11, 'Matematika', 'XI', 'MTK', 34, 29, NULL, 'Tersedia', NULL, NULL, NULL, NULL, NULL),
(12, 'Python', NULL, 'Coding', 10, 10, NULL, 'Tersedia', NULL, NULL, NULL, NULL, NULL),
(14, 'SEJARAH', NULL, 'BHS JEPANG', 3, 3, NULL, 'Tersedia', NULL, NULL, NULL, NULL, NULL),
(15, 'SEJARAH', NULL, 'IPA', 3, 3, NULL, 'Tersedia', NULL, NULL, NULL, NULL, NULL),
(17, 'geografi ktsp 2013', NULL, 'Geografi', 34, 34, NULL, 'Tersedia', NULL, NULL, NULL, NULL, NULL),
(18, 'Budaya Melayu Riau', NULL, 'Seni Tari', 13, 13, NULL, 'Tersedia', NULL, NULL, NULL, NULL, NULL),
(19, 'Sejarah', NULL, 'Geografi', 31, 31, NULL, 'Tersedia', '1756573068168-WhatsApp_Image_2025-08-29_at_20.09.45_c17d80a7.jpg', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `channel_notes`
--

CREATE TABLE `channel_notes` (
  `id` int(11) NOT NULL,
  `channel_id` varchar(255) NOT NULL,
  `message_id` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `created_by_user_id` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_updated_by_user_id` varchar(255) DEFAULT NULL,
  `last_updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `detail_guru_admin`
--

CREATE TABLE `detail_guru_admin` (
  `id_pengguna` int(11) NOT NULL,
  `nip` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `detail_guru_admin`
--

INSERT INTO `detail_guru_admin` (`id_pengguna`, `nip`) VALUES
(15, '199809252023212007');

-- --------------------------------------------------------

--
-- Table structure for table `detail_siswa`
--

CREATE TABLE `detail_siswa` (
  `id_pengguna` int(11) NOT NULL,
  `nis` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `detail_siswa`
--

INSERT INTO `detail_siswa` (`id_pengguna`, `nis`) VALUES
(16, '0054075569');

-- --------------------------------------------------------

--
-- Table structure for table `ebooks`
--

CREATE TABLE `ebooks` (
  `id` int(11) NOT NULL,
  `judul` varchar(255) NOT NULL,
  `penulis` varchar(255) DEFAULT NULL,
  `deskripsi` text DEFAULT NULL,
  `nama_file` varchar(255) NOT NULL,
  `uploader_id` varchar(255) NOT NULL,
  `tanggal_upload` timestamp NOT NULL DEFAULT current_timestamp(),
  `file_sampul` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ebooks`
--

INSERT INTO `ebooks` (`id`, `judul`, `penulis`, `deskripsi`, `nama_file`, `uploader_id`, `tanggal_upload`, `file_sampul`) VALUES
(8, 'DASAR - DASAR JARINGAN KOMPUTER [X]', 'Ibnu Indarwati, Arif Muttakin, Agung Puspita Bantala', 'Seputar komputer', 'https://drive.google.com/file/d/1QbbKAdsqA0SPvI-u-Yi1PyNSj_eKVvlq/view?usp=sharing', '1138656034089615470', '2025-08-14 01:51:33', NULL),
(9, 'INFORMATIKA BS [VII]', 'Maresha Caroline Wijanto, dkk.', '-', 'https://drive.google.com/file/d/169x-34v28fJadbB3WiasdY-jdrhIJpC-/view?usp=sharing', '1138656034089615470', '2025-08-14 01:56:34', NULL),
(10, 'INFORAMTIKA [X]', 'Mushthofa, dkk.', '-', 'https://drive.google.com/file/d/1E87TZcrgq_qdhZcoC6EX0vRX4uSGqcpg/view?usp=sharing', '1138656034089615470', '2025-08-14 01:57:49', NULL),
(11, 'LOGIKA MATEMATIKA', 'Drs. Sukirman, M.Pd.', '-', 'https://drive.google.com/file/d/1PV3V4wemdvTbe4qePA6jZP4yGIZH31Bn/view?usp=sharing', '1138656034089615470', '2025-08-14 01:59:42', NULL),
(14, 'FATHUL QARIB', 'Al-Ustadz Saiful Anwar', 'buku agama islam', 'https://drive.google.com/file/d/1InGc0oE-9QFjJqh3OhZjwEVDPstPFfDS/view?usp=sharing', '1138656034089615470', '2025-08-14 11:41:39', NULL),
(15, 'INFORMATIKA KELAS [X]', 'Mushthofa, dkk.', 'buku informatika', 'https://buku.kemendikdasmen.go.id/katalog/informatika-untuk-sma-kelas-x', '1138656034089615470', '2025-08-14 16:02:03', NULL),
(16, 'PJOK', 'Anggara Aditya, Kurniawan Teguh Karya', '-', 'https://buku.kemendikdasmen.go.id/katalog/pendidikan-jasmani-olahraga-dan-kesehatan-untuk-kelas-smamasmkmak-kelas-x', '1138656034089615470', '2025-08-14 16:26:12', NULL),
(17, 'PJOK KELAS [XI]', 'Anggara Aditiya Kurniawan, Damar Pamungkas', '-', 'https://buku.kemendikdasmen.go.id/katalog/pendidikan-jasmani-olahraga-dan-kesehatan-untuk-smamasmkmak-kelas-xi', '1138656034089615470', '2025-08-14 16:28:42', NULL),
(18, 'MATEMATIKA KELAS [XI]', 'Yosep Dwi Kristanto, Muhammad Taqiyuddin, Al Azhary Masta, Elyda Yulfiana', '-', 'https://buku.kemendikdasmen.go.id/katalog/panduan-guru-matematika-tingkat-lanjut-untuk-sma-ma-kelas-xi-edisi-revisi', '1138656034089615470', '2025-08-14 16:32:36', NULL),
(19, 'ANTROPOLOGI KELAS [XI]', 'Tidak Diketahui', 'Tidak ada deskripsi.', 'https://buku.kemendikdasmen.go.id/katalog/panduan-guru-antropologi-untuk-sma-ma-kelas-xi-edisi-revisi', '1138656034089615470', '2025-08-14 16:34:00', NULL),
(20, 'BAHASA INGGRIS [XI]', 'Anik Muslikah Indriastuti, Rida Afrilyasanti', '-', 'https://buku.kemendikdasmen.go.id/katalog/panduan-guru-bahasa-inggris-tingkat-lanjut-lets-elevate-our-englishuntuk-sma-ma-kelas-xi-edisi-revisi', '1138656034089615470', '2025-08-14 16:35:38', NULL),
(21, 'EKONOMI [XI]', 'Yeni Fitriani, Aisyah Nurjanah', 'Buku Ekonomi', 'https://buku.kemendikdasmen.go.id/katalog/panduan-guru-ekonomi-untuk-sma-ma-kelas-xi-edisi-revisi', '1138656034089615470', '2025-08-14 16:38:22', NULL),
(22, 'GEOGRAFI [XI]', 'Budi Handoyo Nisa Maulia', '-', 'https://buku.kemendikdasmen.go.id/katalog/panduan-guru-geografi-untuk-sma-ma-kelas-xi-edisi-revisi', '1138656034089615470', '2025-08-14 16:39:43', NULL),
(23, 'SOSIOLOGI [XI]', 'Joan Hesti Gita Purwasih, Seli Septiana Pratiwi', '-', 'https://buku.kemendikdasmen.go.id/katalog/panduan-guru-sosiologi-untuk-sma-ma-kelas-xi-edisi-revisi', '1138656034089615470', '2025-08-14 16:42:54', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `jadwal`
--

CREATE TABLE `jadwal` (
  `id_jadwal` int(11) NOT NULL,
  `id_kelas` int(11) NOT NULL,
  `hari` enum('Senin','Selasa','Rabu','Kamis','Jumat') NOT NULL,
  `jam_mulai` time NOT NULL,
  `jam_selesai` time NOT NULL,
  `mata_pelajaran` varchar(100) NOT NULL,
  `nama_guru` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `jadwal`
--

INSERT INTO `jadwal` (`id_jadwal`, `id_kelas`, `hari`, `jam_mulai`, `jam_selesai`, `mata_pelajaran`, `nama_guru`) VALUES
(127, 1, 'Senin', '09:00:00', '09:45:00', 'PJOK', 'yanto'),
(128, 1, 'Senin', '10:45:00', '11:30:00', 'SENBUD', 'arip'),
(129, 1, 'Senin', '13:15:00', '13:50:00', 'Fisika', 'novi'),
(130, 1, 'Senin', '15:00:00', '16:10:00', 'B.INDO', 'neti'),
(131, 1, 'Selasa', '07:30:00', '08:15:00', 'Geografi', 'paijo'),
(132, 1, 'Selasa', '07:30:00', '08:15:00', 'MTK', 'Muslimatun Nikmah, S.Pd'),
(133, 1, 'Selasa', '07:30:00', '08:15:00', 'Ekonomi', 'siti'),
(134, 1, 'Selasa', '07:30:00', '08:15:00', 'Sejarah', 'budi'),
(135, 1, 'Rabu', '07:30:00', '08:15:00', 'AGAMA', 'kipli'),
(136, 1, 'Rabu', '07:30:00', '08:15:00', 'Kimia', 'andika'),
(137, 1, 'Rabu', '07:30:00', '08:15:00', 'BK', 'jaiman'),
(138, 1, 'Rabu', '07:30:00', '08:15:00', 'Sosiologi', 'andini'),
(139, 1, 'Kamis', '07:30:00', '08:15:00', 'B.ING', 'anisa'),
(140, 1, 'Kamis', '07:30:00', '08:15:00', 'MTK', 'atun'),
(141, 1, 'Kamis', '07:30:00', '08:15:00', 'PKN', 'ucup'),
(142, 1, 'Jumat', '07:30:00', '08:15:00', 'Biologi', 'yanti'),
(143, 1, 'Jumat', '07:30:00', '08:15:00', 'B.INDO', 'neti'),
(144, 1, 'Jumat', '07:30:00', '08:15:00', 'B.ING TJ', 'ratna'),
(145, 2, 'Senin', '09:45:00', '10:30:00', 'PJOK', 'yanto'),
(146, 2, 'Senin', '11:30:00', '12:15:00', 'SENBUD', 'arip'),
(147, 2, 'Senin', '13:50:00', '14:25:00', 'Fisika', 'novi'),
(148, 2, 'Senin', '16:10:00', '16:40:00', 'B.INDO', 'neti'),
(149, 2, 'Selasa', '08:15:00', '09:00:00', 'Geografi', 'paijo'),
(150, 2, 'Selasa', '08:15:00', '09:00:00', 'MTK', 'atun'),
(151, 2, 'Selasa', '08:15:00', '09:00:00', 'Ekonomi', 'siti'),
(152, 2, 'Selasa', '08:15:00', '09:00:00', 'Sejarah', 'budi'),
(153, 2, 'Rabu', '08:15:00', '09:00:00', 'AGAMA', 'kipli'),
(154, 2, 'Rabu', '08:15:00', '09:00:00', 'Kimia', 'andika'),
(155, 2, 'Rabu', '08:15:00', '09:00:00', 'BK', 'jaiman'),
(156, 2, 'Rabu', '08:15:00', '09:00:00', 'Sosiologi', 'andini'),
(157, 2, 'Kamis', '08:15:00', '09:00:00', 'B.ING', 'anisa'),
(158, 2, 'Kamis', '08:15:00', '09:00:00', 'MTK', 'atun'),
(159, 2, 'Kamis', '08:15:00', '09:00:00', 'PKN', 'ucup'),
(160, 2, 'Jumat', '08:15:00', '09:00:00', 'Biologi', 'yanti'),
(161, 2, 'Jumat', '08:15:00', '09:00:00', 'B.INDO', 'neti'),
(162, 2, 'Jumat', '08:15:00', '09:00:00', 'B.ING TJ', 'ratna'),
(163, 3, 'Jumat', '09:00:00', '09:45:00', 'PJOK', 'yanto'),
(164, 3, 'Jumat', '10:45:00', '11:30:00', 'SENBUD', 'arip'),
(165, 3, 'Jumat', '13:15:00', '13:50:00', 'Fisika', 'novi'),
(166, 3, 'Jumat', '15:00:00', '16:10:00', 'B.INDO', 'neti'),
(167, 3, 'Senin', '09:00:00', '09:45:00', 'AGAMA', 'kipli'),
(168, 3, 'Senin', '09:00:00', '09:45:00', 'Kimia', 'andika'),
(169, 3, 'Senin', '09:00:00', '09:45:00', 'BK', 'jaiman'),
(170, 3, 'Senin', '09:00:00', '09:45:00', 'Sosiologi', 'andini'),
(171, 3, 'Selasa', '07:30:00', '08:15:00', 'B.ING', 'anisa'),
(172, 3, 'Selasa', '07:30:00', '08:15:00', 'MTK', 'atun'),
(173, 3, 'Selasa', '07:30:00', '08:15:00', 'PKN', 'ucup'),
(174, 3, 'Rabu', '07:30:00', '08:15:00', 'Biologi', 'yanti'),
(175, 3, 'Rabu', '07:30:00', '08:15:00', 'B.INDO', 'neti'),
(176, 3, 'Rabu', '07:30:00', '08:15:00', 'B.ING TJ', 'ratna'),
(177, 4, 'Jumat', '09:45:00', '10:30:00', 'PJOK', 'yanto'),
(178, 4, 'Jumat', '11:30:00', '12:15:00', 'SENBUD', 'arip'),
(179, 4, 'Jumat', '13:50:00', '14:25:00', 'Fisika', 'novi'),
(180, 4, 'Jumat', '16:10:00', '16:40:00', 'B.INDO', 'neti'),
(181, 4, 'Senin', '09:45:00', '10:30:00', 'AGAMA', 'kipli'),
(182, 4, 'Senin', '09:45:00', '10:30:00', 'Kimia', 'andika'),
(183, 4, 'Senin', '09:45:00', '10:30:00', 'BK', 'jaiman'),
(184, 4, 'Senin', '09:45:00', '10:30:00', 'Sosiologi', 'andini'),
(185, 4, 'Selasa', '08:15:00', '09:00:00', 'B.ING', 'anisa'),
(186, 4, 'Selasa', '08:15:00', '09:00:00', 'MTK', 'atun'),
(187, 4, 'Selasa', '08:15:00', '09:00:00', 'PKN', 'ucup'),
(188, 4, 'Rabu', '08:15:00', '09:00:00', 'Biologi', 'yanti'),
(189, 4, 'Rabu', '08:15:00', '09:00:00', 'B.INDO', 'neti'),
(190, 4, 'Rabu', '08:15:00', '09:00:00', 'B.ING TJ', 'ratna'),
(191, 5, 'Rabu', '09:00:00', '09:45:00', 'PJOK', 'yanto'),
(192, 5, 'Rabu', '10:45:00', '11:30:00', 'SENBUD', 'arip'),
(193, 5, 'Rabu', '13:15:00', '13:50:00', 'Fisika', 'novi'),
(194, 5, 'Rabu', '15:00:00', '16:10:00', 'B.INDO', 'neti'),
(195, 5, 'Kamis', '07:30:00', '08:15:00', 'Geografi', 'paijo'),
(196, 5, 'Kamis', '07:30:00', '08:15:00', 'MTK', 'atun'),
(197, 5, 'Kamis', '07:30:00', '08:15:00', 'Ekonomi', 'siti'),
(198, 5, 'Kamis', '07:30:00', '08:15:00', 'Sejarah', 'budi'),
(199, 5, 'Jumat', '09:00:00', '09:45:00', 'AGAMA', 'kipli'),
(200, 5, 'Jumat', '09:00:00', '09:45:00', 'Kimia', 'andika'),
(201, 5, 'Jumat', '09:00:00', '09:45:00', 'BK', 'jaiman'),
(202, 5, 'Jumat', '09:00:00', '09:45:00', 'Sosiologi', 'andini'),
(203, 6, 'Rabu', '09:45:00', '10:30:00', 'PJOK', 'yanto'),
(204, 6, 'Rabu', '11:30:00', '12:15:00', 'SENBUD', 'arip'),
(205, 6, 'Rabu', '13:50:00', '14:25:00', 'Fisika', 'novi'),
(206, 6, 'Rabu', '16:10:00', '16:40:00', 'B.INDO', 'neti'),
(207, 6, 'Kamis', '08:15:00', '09:00:00', 'Geografi', 'paijo'),
(208, 6, 'Kamis', '08:15:00', '09:00:00', 'MTK', 'atun'),
(209, 6, 'Kamis', '08:15:00', '09:00:00', 'Ekonomi', 'siti'),
(210, 6, 'Kamis', '08:15:00', '09:00:00', 'Sejarah', 'budi'),
(211, 6, 'Jumat', '09:45:00', '10:30:00', 'AGAMA', 'kipli'),
(212, 6, 'Jumat', '09:45:00', '10:30:00', 'Kimia', 'andika'),
(213, 6, 'Jumat', '09:45:00', '10:30:00', 'BK', 'jaiman'),
(214, 6, 'Jumat', '09:45:00', '10:30:00', 'Sosiologi', 'andini'),
(215, 16, 'Senin', '09:00:00', '09:45:00', 'SENBUD', 'arip'),
(216, 16, 'Senin', '10:45:00', '11:30:00', 'MTK', 'atun'),
(217, 16, 'Senin', '13:15:00', '13:50:00', 'B.ING TJ', 'ratna'),
(218, 16, 'Senin', '15:00:00', '16:10:00', 'AGAMA', 'kipli'),
(219, 16, 'Selasa', '07:30:00', '08:15:00', 'MTK', 'atun'),
(220, 16, 'Selasa', '07:30:00', '08:15:00', 'B.INDO', 'neti'),
(221, 16, 'Selasa', '07:30:00', '08:15:00', 'B.ING', 'anisa'),
(222, 16, 'Selasa', '07:30:00', '08:15:00', 'Kimia', 'andika'),
(223, 16, 'Rabu', '07:30:00', '08:15:00', 'Sejarah', 'budi'),
(224, 16, 'Rabu', '07:30:00', '08:15:00', 'PJOK', 'yanto'),
(225, 16, 'Rabu', '07:30:00', '08:15:00', 'Geografi', 'paijo'),
(226, 16, 'Rabu', '07:30:00', '08:15:00', 'Sosiologi', 'andini'),
(227, 16, 'Kamis', '07:30:00', '08:15:00', 'PKN', 'ucup'),
(228, 16, 'Kamis', '07:30:00', '08:15:00', 'Biologi', 'yanti'),
(229, 16, 'Kamis', '07:30:00', '08:15:00', 'B.INDO', 'neti'),
(230, 16, 'Kamis', '07:30:00', '08:15:00', 'Fisika', 'novi'),
(231, 16, 'Jumat', '07:30:00', '08:15:00', 'BK', 'jaiman'),
(232, 16, 'Jumat', '07:30:00', '08:15:00', 'Ekonomi', 'siti'),
(233, 17, 'Senin', '09:45:00', '10:30:00', 'SENBUD', 'arip'),
(234, 17, 'Senin', '11:30:00', '12:15:00', 'MTK', 'atun'),
(235, 17, 'Senin', '13:50:00', '14:25:00', 'B.ING TJ', 'ratna'),
(236, 17, 'Senin', '16:10:00', '16:40:00', 'AGAMA', 'kipli'),
(237, 17, 'Selasa', '08:15:00', '09:00:00', 'MTK', 'Muslimatun Nikmah, S.Pd'),
(238, 17, 'Selasa', '08:15:00', '09:00:00', 'B.INDO', 'neti'),
(239, 17, 'Selasa', '08:15:00', '09:00:00', 'B.ING', 'anisa'),
(240, 17, 'Selasa', '08:15:00', '09:00:00', 'Kimia', 'andika'),
(241, 17, 'Rabu', '08:15:00', '09:00:00', 'Sejarah', 'budi'),
(242, 17, 'Rabu', '08:15:00', '09:00:00', 'PJOK', 'yanto'),
(243, 17, 'Rabu', '08:15:00', '09:00:00', 'Geografi', 'paijo'),
(244, 17, 'Rabu', '08:15:00', '09:00:00', 'Sosiologi', 'andini'),
(245, 17, 'Kamis', '08:15:00', '09:00:00', 'PKN', 'ucup'),
(246, 17, 'Kamis', '08:15:00', '09:00:00', 'Biologi', 'yanti'),
(247, 17, 'Kamis', '08:15:00', '09:00:00', 'B.INDO', 'neti'),
(248, 17, 'Kamis', '08:15:00', '09:00:00', 'Fisika', 'novi'),
(249, 17, 'Jumat', '08:15:00', '09:00:00', 'BK', 'jaiman'),
(250, 17, 'Jumat', '08:15:00', '09:00:00', 'Ekonomi', 'siti');

-- --------------------------------------------------------

--
-- Table structure for table `kelas`
--

CREATE TABLE `kelas` (
  `id_kelas` int(11) NOT NULL,
  `nama_kelas` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `kelas`
--

INSERT INTO `kelas` (`id_kelas`, `nama_kelas`) VALUES
(1, 'X.E1'),
(2, 'X.E2'),
(3, 'X.E3'),
(4, 'X.E4'),
(5, 'X.E5'),
(6, 'X.E6'),
(7, 'XI.F1'),
(8, 'XI.F2'),
(9, 'XI.F3'),
(10, 'XI.F4'),
(11, 'XI.F5'),
(12, 'XI.F6'),
(16, 'XII.F10'),
(17, 'XII.F11'),
(18, 'XII.F12'),
(13, 'XII.F7'),
(14, 'XII.F8'),
(15, 'XII.F9');

-- --------------------------------------------------------

--
-- Table structure for table `password_resets`
--

CREATE TABLE `password_resets` (
  `id_reset` int(11) NOT NULL,
  `id_pengguna` int(11) NOT NULL,
  `token` varchar(128) NOT NULL,
  `expires_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `peminjaman`
--

CREATE TABLE `peminjaman` (
  `id_peminjaman` int(11) NOT NULL,
  `id_buku` int(11) NOT NULL,
  `id_kelas` int(11) NOT NULL,
  `id_admin` int(11) DEFAULT NULL,
  `jumlah_pinjam` int(11) NOT NULL,
  `penanggung_jawab` varchar(255) NOT NULL,
  `nama_guru_pengajar` varchar(100) DEFAULT NULL,
  `timestamp_pinjam` datetime NOT NULL,
  `timestamp_kembali` datetime DEFAULT NULL,
  `status` enum('DIPINJAM','DIKEMBALIKAN') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `peminjaman`
--

INSERT INTO `peminjaman` (`id_peminjaman`, `id_buku`, `id_kelas`, `id_admin`, `jumlah_pinjam`, `penanggung_jawab`, `nama_guru_pengajar`, `timestamp_pinjam`, `timestamp_kembali`, `status`) VALUES
(1, 8, 1, 3, 15, 'arip', 'kipli', '2025-08-12 13:04:25', '2025-08-12 15:22:52', 'DIKEMBALIKAN'),
(2, 9, 3, 3, 12, 'reni', 'novi', '2025-08-12 13:07:19', '2025-08-12 13:14:59', 'DIKEMBALIKAN'),
(3, 1, 9, 3, 21, 'HENDI', 'ucup', '2025-08-12 14:05:16', '2025-08-12 15:22:45', 'DIKEMBALIKAN'),
(4, 10, 4, 3, 34, 'tia', 'yanti', '2025-08-12 14:57:19', '2025-08-12 15:22:05', 'DIKEMBALIKAN'),
(5, 8, 9, 3, 5, 'tio', 'kipli', '2025-08-12 15:09:24', '2025-08-12 15:21:28', 'DIKEMBALIKAN'),
(6, 8, 3, NULL, 20, 'Hydra', 'kipli', '2025-08-12 16:05:11', '2025-08-12 16:08:16', 'DIKEMBALIKAN'),
(7, 8, 2, NULL, 2, 'Renal', 'kipli', '2025-08-13 05:54:34', '2025-08-13 05:58:22', 'DIKEMBALIKAN'),
(8, 11, 1, NULL, 12, 'Indal', 'Muslimatun Nikmah, S.Pd', '2025-08-13 06:22:42', '2025-08-13 23:15:53', 'DIKEMBALIKAN'),
(9, 11, 1, NULL, 31, 'Rehan sipanjul', 'Muslimatun Nikmah, S.Pd', '2025-08-14 02:03:44', '2025-08-14 20:58:38', 'DIKEMBALIKAN'),
(10, 11, 1, 3, 3, 'aci', 'atun', '2025-08-14 20:50:18', '2025-08-14 20:58:17', 'DIKEMBALIKAN'),
(11, 11, 1, NULL, 10, 'Andika pratama', 'Muslimatun Nikmah, S.Pd', '2025-08-14 22:39:46', '2025-08-14 22:58:52', 'DIKEMBALIKAN'),
(12, 11, 1, NULL, 10, 'Ical', 'Muslimatun Nikmah, S.Pd', '2025-08-14 22:57:02', '2025-08-14 22:58:45', 'DIKEMBALIKAN'),
(13, 17, 1, 3, 32, 'rehandika', 'paijo', '2025-08-28 01:45:45', '2025-08-30 20:08:03', 'DIKEMBALIKAN'),
(14, 11, 1, 3, 2, 'tey', 'muslim', '2025-08-28 02:12:58', '2025-08-30 20:08:16', 'DIKEMBALIKAN'),
(15, 11, 1, NULL, 21, 'Saputra', 'Muslimatun Nikmah, S.Pd', '2025-08-28 21:04:19', '2025-08-30 20:07:57', 'DIKEMBALIKAN'),
(16, 17, 2, 3, 21, 'renaldi', 'ratna', '2025-08-30 21:16:40', '2025-08-30 21:17:01', 'DIKEMBALIKAN'),
(17, 11, 1, NULL, 30, 'Andika Pratama', 'Muslimatun Nikmah, S.Pd', '2025-08-31 00:57:05', '2025-08-31 01:11:44', 'DIKEMBALIKAN'),
(18, 18, 2, NULL, 13, 'Deni', 'neti', '2025-08-31 01:06:03', '2025-08-31 01:11:38', 'DIKEMBALIKAN'),
(19, 10, 3, NULL, 5, 'Adi', 'anisa', '2025-08-31 01:11:04', '2025-08-31 01:11:34', 'DIKEMBALIKAN'),
(20, 10, 1, NULL, 1, 'Andesta', 'anisa', '2025-08-31 08:05:08', '2025-08-31 09:06:32', 'DIKEMBALIKAN'),
(21, 8, 1, 3, 1, 'hydra0848_74017', NULL, '2025-08-31 08:36:16', '2025-08-31 09:09:46', 'DIKEMBALIKAN'),
(22, 8, 1, 3, 1, 'hydra0848_74017', NULL, '2025-08-31 08:42:51', '2025-08-31 09:09:36', 'DIKEMBALIKAN'),
(23, 11, 1, 3, 5, 'Arifin', 'Muslimatun Nikmah, S.Pd', '2025-08-31 08:51:21', '2025-08-31 09:09:27', 'DIKEMBALIKAN'),
(24, 11, 1, 3, 5, 'hydra0848_74017', 'atun', '2025-08-31 08:58:56', '2025-08-31 09:09:20', 'DIKEMBALIKAN'),
(25, 8, 2, 3, 6, 'Yanto', 'kipli', '2025-08-31 09:02:37', '2025-08-31 09:06:37', 'DIKEMBALIKAN'),
(26, 8, 1, 3, 20, 'Rahmat saipudin', 'kipli', '2025-08-31 09:10:46', '2025-08-31 10:02:22', 'DIKEMBALIKAN'),
(27, 11, 1, 3, 5, 'REHANDIKA', 'Muslimatun Nikmah, S.Pd', '2025-08-31 09:16:25', '2025-08-31 10:02:16', 'DIKEMBALIKAN'),
(28, 11, 1, 3, 6, 'Levi', 'Muslimatun Nikmah, S.Pd', '2025-08-31 09:53:26', '2025-08-31 10:02:10', 'DIKEMBALIKAN'),
(29, 11, 1, 3, 1, 'Muhammad', 'Muslimatun Nikmah, S.Pd', '2025-08-31 10:05:28', '2025-08-31 10:27:43', 'DIKEMBALIKAN'),
(30, 11, 1, 3, 20, 'Muhammad', 'Muslimatun Nikmah, S.Pd', '2025-08-31 10:29:15', '2025-08-31 10:40:33', 'DIKEMBALIKAN'),
(31, 10, 1, 3, 5, 'Muhammad', '', '2025-09-05 17:09:25', NULL, 'DIPINJAM'),
(32, 11, 1, 3, 5, 'Muhammad', '', '2025-09-05 17:10:36', NULL, 'DIPINJAM');

-- --------------------------------------------------------

--
-- Table structure for table `pengguna`
--

CREATE TABLE `pengguna` (
  `id_pengguna` int(11) NOT NULL,
  `nama_lengkap` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `password_salt` varchar(64) NOT NULL,
  `tipe_pengguna` enum('siswa','guru','admin') NOT NULL,
  `discord_id` varchar(100) DEFAULT NULL,
  `terverifikasi` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pengguna`
--

INSERT INTO `pengguna` (`id_pengguna`, `nama_lengkap`, `email`, `password_hash`, `password_salt`, `tipe_pengguna`, `discord_id`, `terverifikasi`) VALUES
(15, 'Muslimatun Nikmah', 'muslimatun25nikmah@gmail.com', '542e471dcd66f2b73b66adbaf5fb124132417b74077bf863921d776e5918345e79d76e40bcd3217958b531025c62046432113e5940b12a4caa651be32c0651b3', 'be4c6f9bae04f6f772cc4391d36201a4', 'guru', '1410619386145804349', 0),
(16, 'Muhammad', 'abimyu15@gmail.com', 'eed3b3f634ddc13b5507564ac7e837447cc749897df34c076014551053b493d2942e934a1d763a83dac1fd34d750c86724a661b33b821093f77e093d02f14087', '15acc12a9a9b991e63d50be8e2ceb454', 'siswa', '1403620786828480544', 0);

-- --------------------------------------------------------

--
-- Table structure for table `quiz_options`
--

CREATE TABLE `quiz_options` (
  `option_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `option_text` varchar(255) NOT NULL,
  `is_correct` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quiz_questions`
--

CREATE TABLE `quiz_questions` (
  `question_id` int(11) NOT NULL,
  `rank_id` int(11) NOT NULL,
  `question_text` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quiz_ranks`
--

CREATE TABLE `quiz_ranks` (
  `rank_id` int(11) NOT NULL,
  `rank_name` varchar(255) NOT NULL,
  `rank_level` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `quiz_ranks`
--

INSERT INTO `quiz_ranks` (`rank_id`, `rank_name`, `rank_level`) VALUES
(1, 'Peserta Baru', 1),
(2, 'Pembelajar Muda', 2),
(3, 'Penjelajah Ilmu', 3),
(4, 'Penguasaan Materi', 4),
(5, 'Cendekia Remaja', 5),
(6, 'Teladan Kelas', 6),
(7, 'Bintang Kuis', 7);

-- --------------------------------------------------------

--
-- Table structure for table `user_quiz_profiles`
--

CREATE TABLE `user_quiz_profiles` (
  `user_profile_id` int(11) NOT NULL,
  `id_pengguna` int(11) NOT NULL,
  `current_rank_id` int(11) NOT NULL,
  `total_score` int(11) NOT NULL DEFAULT 0,
  `last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`id_admin`),
  ADD UNIQUE KEY `discord_id` (`discord_id`);

--
-- Indexes for table `app_config`
--
ALTER TABLE `app_config`
  ADD PRIMARY KEY (`config_key`);

--
-- Indexes for table `buku`
--
ALTER TABLE `buku`
  ADD PRIMARY KEY (`id_buku`),
  ADD KEY `idx_buku_status` (`status`),
  ADD KEY `idx_tingkat_kelas` (`tingkat_kelas`);

--
-- Indexes for table `channel_notes`
--
ALTER TABLE `channel_notes`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `detail_guru_admin`
--
ALTER TABLE `detail_guru_admin`
  ADD PRIMARY KEY (`id_pengguna`),
  ADD UNIQUE KEY `nip` (`nip`);

--
-- Indexes for table `detail_siswa`
--
ALTER TABLE `detail_siswa`
  ADD PRIMARY KEY (`id_pengguna`),
  ADD UNIQUE KEY `nis` (`nis`);

--
-- Indexes for table `ebooks`
--
ALTER TABLE `ebooks`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `jadwal`
--
ALTER TABLE `jadwal`
  ADD PRIMARY KEY (`id_jadwal`),
  ADD KEY `id_kelas` (`id_kelas`);

--
-- Indexes for table `kelas`
--
ALTER TABLE `kelas`
  ADD PRIMARY KEY (`id_kelas`),
  ADD UNIQUE KEY `nama_kelas` (`nama_kelas`);

--
-- Indexes for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD PRIMARY KEY (`id_reset`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `idx_pengguna_id` (`id_pengguna`);

--
-- Indexes for table `peminjaman`
--
ALTER TABLE `peminjaman`
  ADD PRIMARY KEY (`id_peminjaman`),
  ADD KEY `id_buku` (`id_buku`),
  ADD KEY `id_kelas` (`id_kelas`),
  ADD KEY `id_admin` (`id_admin`),
  ADD KEY `idx_peminjaman_status` (`status`);

--
-- Indexes for table `pengguna`
--
ALTER TABLE `pengguna`
  ADD PRIMARY KEY (`id_pengguna`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `discord_id` (`discord_id`);

--
-- Indexes for table `quiz_options`
--
ALTER TABLE `quiz_options`
  ADD PRIMARY KEY (`option_id`),
  ADD KEY `idx_question_id` (`question_id`);

--
-- Indexes for table `quiz_questions`
--
ALTER TABLE `quiz_questions`
  ADD PRIMARY KEY (`question_id`),
  ADD KEY `idx_rank_id` (`rank_id`);

--
-- Indexes for table `quiz_ranks`
--
ALTER TABLE `quiz_ranks`
  ADD PRIMARY KEY (`rank_id`),
  ADD UNIQUE KEY `rank_name` (`rank_name`),
  ADD UNIQUE KEY `rank_level` (`rank_level`);

--
-- Indexes for table `user_quiz_profiles`
--
ALTER TABLE `user_quiz_profiles`
  ADD PRIMARY KEY (`user_profile_id`),
  ADD UNIQUE KEY `unique_user` (`id_pengguna`),
  ADD KEY `idx_rank_id_profiles` (`current_rank_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin`
--
ALTER TABLE `admin`
  MODIFY `id_admin` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `buku`
--
ALTER TABLE `buku`
  MODIFY `id_buku` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `channel_notes`
--
ALTER TABLE `channel_notes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ebooks`
--
ALTER TABLE `ebooks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `jadwal`
--
ALTER TABLE `jadwal`
  MODIFY `id_jadwal` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=253;

--
-- AUTO_INCREMENT for table `kelas`
--
ALTER TABLE `kelas`
  MODIFY `id_kelas` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `password_resets`
--
ALTER TABLE `password_resets`
  MODIFY `id_reset` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `peminjaman`
--
ALTER TABLE `peminjaman`
  MODIFY `id_peminjaman` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `pengguna`
--
ALTER TABLE `pengguna`
  MODIFY `id_pengguna` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `quiz_options`
--
ALTER TABLE `quiz_options`
  MODIFY `option_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `quiz_questions`
--
ALTER TABLE `quiz_questions`
  MODIFY `question_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `quiz_ranks`
--
ALTER TABLE `quiz_ranks`
  MODIFY `rank_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `user_quiz_profiles`
--
ALTER TABLE `user_quiz_profiles`
  MODIFY `user_profile_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `detail_guru_admin`
--
ALTER TABLE `detail_guru_admin`
  ADD CONSTRAINT `fk_guru_admin_pengguna` FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna` (`id_pengguna`) ON DELETE CASCADE;

--
-- Constraints for table `detail_siswa`
--
ALTER TABLE `detail_siswa`
  ADD CONSTRAINT `fk_siswa_pengguna` FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna` (`id_pengguna`) ON DELETE CASCADE;

--
-- Constraints for table `jadwal`
--
ALTER TABLE `jadwal`
  ADD CONSTRAINT `jadwal_ibfk_1` FOREIGN KEY (`id_kelas`) REFERENCES `kelas` (`id_kelas`);

--
-- Constraints for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD CONSTRAINT `fk_reset_pengguna` FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna` (`id_pengguna`) ON DELETE CASCADE;

--
-- Constraints for table `peminjaman`
--
ALTER TABLE `peminjaman`
  ADD CONSTRAINT `peminjaman_ibfk_1` FOREIGN KEY (`id_buku`) REFERENCES `buku` (`id_buku`),
  ADD CONSTRAINT `peminjaman_ibfk_2` FOREIGN KEY (`id_kelas`) REFERENCES `kelas` (`id_kelas`),
  ADD CONSTRAINT `peminjaman_ibfk_3` FOREIGN KEY (`id_admin`) REFERENCES `admin` (`id_admin`);

--
-- Constraints for table `quiz_options`
--
ALTER TABLE `quiz_options`
  ADD CONSTRAINT `fk_option_question` FOREIGN KEY (`question_id`) REFERENCES `quiz_questions` (`question_id`) ON DELETE CASCADE;

--
-- Constraints for table `quiz_questions`
--
ALTER TABLE `quiz_questions`
  ADD CONSTRAINT `fk_question_rank` FOREIGN KEY (`rank_id`) REFERENCES `quiz_ranks` (`rank_id`) ON DELETE CASCADE;

--
-- Constraints for table `user_quiz_profiles`
--
ALTER TABLE `user_quiz_profiles`
  ADD CONSTRAINT `fk_profile_rank` FOREIGN KEY (`current_rank_id`) REFERENCES `quiz_ranks` (`rank_id`),
  ADD CONSTRAINT `fk_profile_user` FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna` (`id_pengguna`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;